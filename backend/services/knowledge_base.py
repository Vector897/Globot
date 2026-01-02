"""
知识库模块 - RAG (Retrieval-Augmented Generation)
使用Chroma向量数据库存储和检索产品文档
"""
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from config import get_settings
import logging
from typing import List

logger = logging.getLogger(__name__)
settings = get_settings()

class KnowledgeBase:
    """RAG知识库"""
    
    def __init__(self):
        # 使用本地Embedding模型（中英文支持）
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
        )
        
        # 初始化Chroma向量库
        self.vectorstore = Chroma(
            persist_directory=settings.chroma_persist_dir,
            embedding_function=self.embeddings
        )
        
        logger.info(f"知识库初始化完成:  {settings.chroma_persist_dir}")
    
    def search(self, query: str, product_filter: str = None, top_k: int = 5, similarity_threshold: float = 0.3) -> List[Document]:
        """
        检索相关文档（优化版）
        
        Args:
            query: 查询文本
            product_filter: 产品过滤器 (如 "M30", "M400", "Dock3")
            top_k: 返回文档数量 (增加到5以获取更多上下文)
            similarity_threshold: 相似度阈值 (0-1)，过滤低相关性文档
            
        Returns:
            相关文档列表
        """
        try:
            # 构建过滤条件
            filter_dict = None
            if product_filter:
                filter_dict = {"product_tag": product_filter}
            
            # 相似度检索 with scores
            docs_and_scores = self.vectorstore.similarity_search_with_score(
                query,
                k=top_k,
                filter=filter_dict
            )
            
            # 过滤低相关性文档 (score越低越相关)
            # Chroma使用L2距离，score越小越相似
            filtered_docs = [
                doc for doc, score in docs_and_scores 
                if score <= (1.0 - similarity_threshold)  # 转换为相似度
            ]
            
            # 如果过滤后没有结果，至少返回top 2
            if not filtered_docs and docs_and_scores:
                filtered_docs = [doc for doc, _ in docs_and_scores[:2]]
            
            logger.info(f"检索到 {len(filtered_docs)}/{len(docs_and_scores)} 个相关文档 (查询: {query[:50]}...)")
            return filtered_docs
            
        except Exception as e:
            logger.error(f"检索失败: {e}")
            # Fallback to regular search
            try:
                docs = self.vectorstore.similarity_search(
                    query,
                    k=min(3, top_k),
                    filter=filter_dict if product_filter else None
                )
                return docs
            except:
                return []
    
    def add_documents(self, documents: List[Document]):
        """添加文档到知识库"""
        try:
            self.vectorstore.add_documents(documents)
            logger.info(f"成功添加 {len(documents)} 个文档")
        except Exception as e:
            logger.error(f"添加文档失败: {e}")

# 全局单例
_kb = None

def get_knowledge_base() -> KnowledgeBase:
    """获取知识库实例（单例）"""
    global _kb
    if _kb is None:
        _kb = KnowledgeBase()
    return _kb
