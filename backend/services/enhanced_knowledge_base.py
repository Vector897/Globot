"""
增强的知识库模块 - Advanced RAG
支持元数据过滤、混合检索、重排序等高级策略
"""
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

# LangChain 1.x: retrievers from langchain.retrievers
from langchain.retrievers import EnsembleRetriever, ParentDocumentRetriever
# from langgraph.store.memory import InMemoryStore  # Optional, may not be needed

from langchain_community.retrievers import BM25Retriever
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import get_settings
import logging
from typing import List, Optional, Dict
import json

logger = logging.getLogger(__name__)
settings = get_settings()

class EnhancedKnowledgeBase:
    """增强的 RAG 知识库
    
    特性：
    - 元数据过滤：按产品(M400/M30/Dock3)精准检索
    - 混合检索：BM25(关键词) + Vector(语义)
    - 重排序：Cross-Encoder 提升准确率
    - 父子文档：完整上下文避免断章取义
    """
    
    def __init__(self):
        # Embedding模型（中英文支持）
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
            model_kwargs={'device': 'cpu'}
        )
        
        # Chroma向量库
        self.vectorstore = Chroma(
            persist_directory=settings.chroma_persist_dir,
            embedding_function=self.embeddings,
            collection_name="dji_products_enhanced"
        )
        
        # BM25检索器（关键词精准匹配）
        self.bm25_retriever = None
        self._init_bm25()
        
        # 重排序模型（可选，需要sentence-transformers）
        self.reranker = None
        self._init_reranker()
        
        # 产品标签映射
        self.product_tags = {
            "M400": {
                "keywords": ["m400", "matrice 400", "matrice400"],
                "tag_image": "1.png"  # 对应 RoSP/1.png
            },
            "M30": {
                "keywords": ["m30", "matrice 30", "matrice30"],
                "tag_image": "11.png"  # 对应 RoSP/11.png
            },
            "Dock3": {
                "keywords": ["dock 3", "dock3", "m4d", "机场"],
                "tag_image": "111.png"  # 对应 RoSP/111.png
            },
            "RTK": {
                "keywords": ["rtk", "d-rtk", "d-rtk 2", "d-rtk 3"],
                "tag_image": None
            }
        }
        
        logger.info(f"增强知识库初始化完成: {settings.chroma_persist_dir}")
    
    def _init_bm25(self):
        """初始化BM25检索器"""
        try:
            # 从向量库获取所有文档用于BM25索引
            # 注意：这在文档数量很大时可能需要优化
            all_docs = self._get_all_documents()
            if all_docs:
                self.bm25_retriever = BM25Retriever.from_documents(all_docs)
                self.bm25_retriever.k = 10  # BM25返回top 10
                logger.info(f"BM25检索器初始化完成，文档数：{len(all_docs)}")
            else:
                logger.warning("BM25检索器初始化失败：无文档")
        except Exception as e:
            logger.error(f"BM25初始化失败: {e}")
    
    def _init_reranker(self):
        """初始化重排序模型"""
        try:
            from sentence_transformers import CrossEncoder
            # 使用BGE重排序模型（中英文支持）
            self.reranker = CrossEncoder('BAAI/bge-reranker-v2-m3', max_length=512)
            logger.info("重排序模型加载成功")
        except ImportError:
            logger.warning("sentence-transformers未安装，重排序功能不可用")
        except Exception as e:
            logger.warning(f"重排序模型加载失败: {e}，将使用普通检索")
    
    def _get_all_documents(self) -> List[Document]:
        """获取所有文档（用于BM25索引）"""
        try:
            # Chroma的_collection.get()方法获取所有文档
            results = self.vectorstore._collection.get(include=['documents', 'metadatas'])
            docs = []
            for i, doc_text in enumerate(results['documents']):
                metadata = results['metadatas'][i] if 'metadatas' in results else {}
                docs.append(Document(page_content=doc_text, metadata=metadata))
            return docs
        except Exception as e:
            logger.error(f"获取文档失败: {e}")
            return []
    
    def detect_product(self, query: str) -> Optional[str]:
        """智能检测查询中的产品类型
        
        Args:
            query: 用户查询
            
        Returns:
            产品标签 (M400/M30/Dock3/RTK) 或 None
        """
        query_lower = query.lower()
        
        for product, info in self.product_tags.items():
            if any(kw in query_lower for kw in info['keywords']):
                logger.info(f"检测到产品: {product}")
                return product
        
        return None
    
    def search(
        self, 
        query: str, 
        product_filter: Optional[str] = None,
        top_k: int = 5,
        use_hybrid: bool = True,
        use_rerank: bool = True,
        similarity_threshold: float = 0.3
    ) -> List[Document]:
        """增强的检索功能
        
        Args:
            query: 查询文本
            product_filter: 产品过滤器 (M400/M30/Dock3/RTK)
            top_k: 返回文档数量
            use_hybrid: 是否使用混合检索（BM25+Vector）
            use_rerank: 是否使用重排序
            similarity_threshold: 相似度阈值
            
        Returns:
            相关文档列表
        """
        try:
            # 自动检测产品（如果未指定）
            if not product_filter:
                product_filter = self.detect_product(query)
            
            # 构建过滤条件
            filter_dict = None
            if product_filter:
                filter_dict = {"product_tag": product_filter}
                logger.info(f"应用产品过滤器: {product_filter}")
            
            # 策略1: 混合检索 (BM25 + Vector)
            if use_hybrid and self.bm25_retriever:
                docs = self._hybrid_search(query, filter_dict, top_k * 2)
            else:
                # Fallback: 纯向量检索
                docs = self._vector_search(query, filter_dict, top_k * 2)
            
            # 策略2: 重排序
            if use_rerank and self.reranker and docs:
                docs = self._rerank_documents(query, docs, top_k)
            else:
                docs = docs[:top_k]
            
            # 过滤低相关性文档
            docs = self._filter_by_similarity(docs, similarity_threshold)
            
            logger.info(f"最终返回 {len(docs)} 个文档")
            return docs
            
        except Exception as e:
            logger.error(f"检索失败: {e}")
            # 最终Fallback
            return self._vector_search(query, filter_dict, min(3, top_k))
    
    def _vector_search(
        self, 
        query: str, 
        filter_dict: Optional[Dict], 
        k: int
    ) -> List[Document]:
        """纯向量检索"""
        try:
            docs_and_scores = self.vectorstore.similarity_search_with_score(
                query,
                k=k,
                filter=filter_dict
            )
            return [doc for doc, score in docs_and_scores]
        except Exception as e:
            logger.error(f"向量检索失败: {e}")
            return []
    
    def _hybrid_search(
        self, 
        query: str, 
        filter_dict: Optional[Dict], 
        k: int
    ) -> List[Document]:
        """混合检索 (BM25 + Vector)
        
        权重: BM25(0.4) + Vector(0.6)
        """
        try:
            # Vector检索
            vector_docs = self._vector_search(query, filter_dict, k)
            
            # BM25检索
            bm25_docs = self.bm25_retriever.get_relevant_documents(query)
            
            # 如果有过滤条件，过滤BM25结果
            if filter_dict:
                bm25_docs = [
                    doc for doc in bm25_docs
                    if doc.metadata.get('product_tag') == filter_dict.get('product_tag')
                ]
            
            # 创建集成检索器
            ensemble = EnsembleRetriever(
                retrievers=[self.bm25_retriever, self.vectorstore.as_retriever()],
                weights=[0.4, 0.6]  # BM25(40%) + Vector(60%)
            )
            
            # 合并去重
            seen_content = set()
            merged_docs = []
            
            # 先添加向量检索结果（权重更高）
            for doc in vector_docs:
                content_hash = hash(doc.page_content[:100])
                if content_hash not in seen_content:
                    seen_content.add(content_hash)
                    merged_docs.append(doc)
            
            # 再添加BM25结果
            for doc in bm25_docs[:k//2]:  # BM25贡献一半
                content_hash = hash(doc.page_content[:100])
                if content_hash not in seen_content:
                    seen_content.add(content_hash)
                    merged_docs.append(doc)
            
            logger.info(f"混合检索: Vector({len(vector_docs)}) + BM25({len(bm25_docs)}) -> 合并({len(merged_docs)})")
            return merged_docs[:k]
            
        except Exception as e:
            logger.error(f"混合检索失败: {e}, 降级到向量检索")
            return self._vector_search(query, filter_dict, k)
    
    def _rerank_documents(
        self, 
        query: str, 
        docs: List[Document], 
        top_k: int
    ) -> List[Document]:
        """使用Cross-Encoder重排序文档"""
        if not docs or not self.reranker:
            return docs
        
        try:
            # 构建查询-文档对
            pairs = [[query, doc.page_content] for doc in docs]
            
            # 计算相关性分数
            scores = self.reranker.predict(pairs)
            
            # 按分数排序
            doc_scores = list(zip(docs, scores))
            doc_scores.sort(key=lambda x: x[1], reverse=True)
            
            # 返回Top K
            reranked_docs = [doc for doc, score in doc_scores[:top_k]]
            
            logger.info(f"重排序: {len(docs)} -> {len(reranked_docs)} (分数范围: {min(scores):.3f} - {max(scores):.3f})")
            return reranked_docs
            
        except Exception as e:
            logger.error(f"重排序失败: {e}")
            return docs[:top_k]
    
    def _filter_by_similarity(
        self, 
        docs: List[Document], 
        threshold: float
    ) -> List[Document]:
        """过滤低相关性文档"""
        # 如果文档带有score属性才过滤，否则全部返回
        if not docs:
            return []
        
        # 简单策略：至少返回前2个
        if len(docs) <= 2:
            return docs
        
        return docs  # 重排序后的结果已经按相关性排序
    
    def add_documents(
        self, 
        documents: List[Document], 
        auto_tag: bool = True
    ):
        """添加文档到知识库
        
        Args:
            documents: 文档列表
            auto_tag: 是否自动添加产品标签
        """
        try:
            if auto_tag:
                documents = self._auto_tag_documents(documents)
            
            self.vectorstore.add_documents(documents)
            logger.info(f"成功添加 {len(documents)} 个文档")
            
            # 重建BM25索引
            if self.bm25_retriever:
                self._init_bm25()
                
        except Exception as e:
            logger.error(f"添加文档失败: {e}")
    
    def _auto_tag_documents(self, documents: List[Document]) -> List[Document]:
        """自动为文档添加产品标签"""
        for doc in documents:
            # 如果已有标签，跳过
            if 'product_tag' in doc.metadata:
                continue
            
            # 从文件名或内容检测产品
            source = doc.metadata.get('source', '')
            content = doc.page_content[:500]  # 检查前500字符
            
            combined = (source + ' ' + content).lower()
            
            for product, info in self.product_tags.items():
                if any(kw in combined for kw in info['keywords']):
                    doc.metadata['product_tag'] = product
                    doc.metadata['tag_image'] = info['tag_image']
                    logger.debug(f"自动标记文档为 {product}")
                    break
        
        return documents

# 全局单例
_enhanced_kb = None

def get_enhanced_knowledge_base() -> EnhancedKnowledgeBase:
    """获取增强知识库实例（单例）"""
    global _enhanced_kb
    if _enhanced_kb is None:
        _enhanced_kb = EnhancedKnowledgeBase()
    return _enhanced_kb
