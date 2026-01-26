# """
# 知识库模块 - RAG (Retrieval-Augmented Generation)
# 使用Chroma向量数据库存储和检索产品文档
# """
# import logging
# import os
# from langchain_community.embeddings import HuggingFaceEmbeddings
# from langchain_community.vectorstores import Chroma
# from langchain_text_splitters import RecursiveCharacterTextSplitter
# try:
#     from langchain_core.documents import Document
# except ImportError:
#     class Document:
#         def __init__(self, page_content, metadata=None):
#             self.page_content = page_content
#             self.metadata = metadata or {}

from typing import List, Optional
from pathlib import Path
import json
from config import get_settings

# logger = logging.getLogger(__name__)
# settings = get_settings()

# 加载 Globot System Knowledge Base (用于 System Prompt)
def load_globot_system_kb() -> dict:
    """Load Globot System Knowledge Base JSON for Agent system prompts."""
    try:
        kb_path = Path(__file__).parent.parent.parent / "Globot System Knowledge Base.JSON"
        if kb_path.exists():
            with open(kb_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        logger.warning(f"Globot System KB not found at {kb_path}")
    except Exception as e:
        logger.error(f"Failed to load Globot System KB: {e}")
    return []

# 全局变量存储 System KB
GLOBOT_SYSTEM_KB = load_globot_system_kb()

def get_globot_system_prompt() -> str:
    """Generate system prompt with Knowledge Base index."""
    if not GLOBOT_SYSTEM_KB:
        return "You are Globot, an AI Logistics Coordinator."
    
    return f"""You are Globot, an advanced AI Logistics Coordinator powered by a Multi-Agent system.

Your decisions must be grounded in facts. You have access to a specialized Knowledge Base (RAG System). 
Below is the index of documents available to you. 
When a user asks a question, refer to the 'usage_scenario' to decide which document to retrieve content from.

Available Knowledge Base Index:
{json.dumps(GLOBOT_SYSTEM_KB, ensure_ascii=False, indent=2)}

INSTRUCTIONS:
1. Identify the intent of the user's query (e.g., Compliance, Cost, Risk).
2. Select the most relevant document category.
3. Use the 'keywords' to form a search query for the RAG tool.
4. Base your final answer STRICTLY on the retrieved context.
"""

# Optional Imports with Graceful Fallback
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import Chroma
    HAS_LANGCHAIN_COMMUNITY = True
except ImportError:
    HAS_LANGCHAIN_COMMUNITY = False
    logger.warning("langchain_community not found. KnowledgeBase will run in MOCK mode.")

# try:
#     from rank_bm25 import BM25Okapi
#     import jieba
#     HAS_BM25 = True
# except ImportError:
#     HAS_BM25 = False
#     logger.warning("rank_bm25 or jieba not found. Hybrid Search disabled.")

# try:
#     from sentence_transformers import CrossEncoder
#     HAS_RERANKER = True
# except ImportError:
#     HAS_RERANKER = False

# class KnowledgeBase:
#     """RAG知识库 (Enhanced with Hybrid Search & Reranking & Mock Support)"""
    
#     def __init__(self):
#         self.mock_mode = not HAS_LANGCHAIN_COMMUNITY
#         self.vectorstore = None
#         self.embeddings = None
#         self.reranker = None
#         self.bm25 = None
#         self.doc_map = {}
#         self.bm25_ids = []

#         if not self.mock_mode:
#             try:
#                 # 1. Embedding Model
#                 self.embeddings = HuggingFaceEmbeddings(
#                     model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
#                 )
                
#                 # 2. Vector Store
#                 self.vectorstore = Chroma(
#                     persist_directory=settings.chroma_persist_dir,
#                     embedding_function=self.embeddings
#                 )
                
#                 # 3. Reranker
#                 if HAS_RERANKER:
#                     try:
#                         self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
#                         logger.info("Reranker model loaded.")
#                     except Exception as e:
#                         logger.warning(f"Failed to load Reranker: {e}")
                
#                 # 4. BM25
#                 if HAS_BM25:
#                     self._build_bm25_index()
                    
#                 logger.info(f"知识库初始化完成: {settings.chroma_persist_dir}")
                
                # 加载 Mock 数据到 VectorStore
                self._load_mock_data()
                
            except Exception as e:
                logger.error(f"Failed to initialize VectorStore: {e}. Switching to MOCK mode.")
                self.mock_mode = True
        else:
            logger.info("KnowledgeBase initialized in MOCK mode.")
    
    def _load_mock_data(self):
        """Load mock data from backend/data/mock/ into VectorStore."""
        try:
            from services.mock_knowledge_base import MockKnowledgeBase
            mock_kb = MockKnowledgeBase()
            mock_docs = mock_kb.load_all()
            
            if mock_docs and self.vectorstore:
                # 检查是否已加载过 (避免重复)
                existing_ids = set(self.vectorstore.get().get('ids', []))
                new_docs = [d for d in mock_docs if d.metadata.get('id') not in existing_ids]
                
                if new_docs:
                    self.vectorstore.add_documents(new_docs)
                    logger.info(f"Added {len(new_docs)} mock documents to VectorStore.")
                else:
                    logger.info("Mock documents already loaded in VectorStore.")
        except ImportError:
            logger.warning("MockKnowledgeBase not available, skipping mock data load.")
        except Exception as e:
            logger.error(f"Failed to load mock data: {e}")

#     def _build_bm25_index(self):
#         try:
#             if not self.vectorstore: return
            
#             data = self.vectorstore.get()
#             ids = data['ids']
#             texts = data['documents']
#             metadatas = data['metadatas']
            
#             if not texts: return

#             self.doc_map = {}
#             tokenized_corpus = []
            
#             for i, doc_id in enumerate(ids):
#                 text = texts[i]
#                 metadata = metadatas[i] if metadatas else {}
#                 doc = Document(page_content=text, metadata=metadata)
#                 self.doc_map[doc_id] = doc
#                 tokens = list(jieba.cut_for_search(text))
#                 tokenized_corpus.append(tokens)
            
#             self.bm25 = BM25Okapi(tokenized_corpus)
#             self.bm25_ids = ids
#             logger.info(f"BM25 index built with {len(texts)} documents.")
#         except Exception as e:
#             logger.error(f"BM25 build failed: {e}")

#     def search(self, query: str, product_filter: str = None, top_k: int = 5, use_rerank: bool = True) -> List[Document]:
#         """Hybrid Search + Rerank (or Mock)"""
#         if self.mock_mode:
#             return self._get_mock_results(query, product_filter)
            
#         try:
#             # 1. Hybrid Retrieval
#             candidates = self._hybrid_retrieval(query, product_filter, k=top_k*3)
#             if not candidates: return []
            
#             # 2. Rerank
#             if use_rerank and self.reranker:
#                 return self._rerank(query, candidates, top_k)
#             return candidates[:top_k]
            
#         except Exception as e:
#             logger.error(f"Search failed: {e}. Returning mock results.")
#             return self._get_mock_results(query, product_filter)

#     def _hybrid_retrieval(self, query: str, product_filter: str, k: int) -> List[Document]:
#         # Vector Search
#         filter_dict = {"product_tag": product_filter} if product_filter else None
#         vector_docs = self.vectorstore.similarity_search(query, k=k, filter=filter_dict)
        
#         # BM25 Search
#         bm25_docs = []
#         if self.bm25:
#             tokenized_query = list(jieba.cut_for_search(query))
#             doc_scores = self.bm25.get_scores(tokenized_query)
#             top_n = sorted(range(len(doc_scores)), key=lambda i: doc_scores[i], reverse=True)[:k]
#             for idx in top_n:
#                 if doc_scores[idx] > 0:
#                     doc = self.doc_map.get(self.bm25_ids[idx])
#                     if pd_filter_check(doc, product_filter):
#                         bm25_docs.append(doc)
        
#         # Merge
#         seen = set()
#         unique = []
#         for doc in vector_docs + bm25_docs:
#             sig = doc.page_content[:100]
#             if sig not in seen:
#                 seen.add(sig)
#                 unique.append(doc)
#         return unique

#     def _rerank(self, query: str, docs: List[Document], top_k: int) -> List[Document]:
#         pairs = [[query, doc.page_content] for doc in docs]
#         scores = self.reranker.predict(pairs)
#         doc_score = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
#         return [d for d, s in doc_score[:top_k]]

#     def _get_mock_results(self, query: str, product_filter: str) -> List[Document]:
#         """Generate context-aware mock data"""
#         logger.info(f"Generating mock results for: {query} ({product_filter})")
        
#         # M30 Specific Mock
#         if "M30" in query or str(product_filter) == "M30":
#             return [
#                 Document(page_content="Matrice 30系列的TB30智能电池，支持自加热，循环次数高达400次。", metadata={"product_tag": "M30", "source": "M30_User_Manual.pdf"}),
#                 Document(page_content="M30 飞行器最大抗风等级为15 m/s。", metadata={"product_tag": "M30", "source": "M30_Specs.pdf"})
#             ]
        
#         # Dock Specific Mock
#         if "Dock" in query or "机场" in query or str(product_filter) == "Dock3":
#             return [
#                 Document(page_content="DJI Dock 3 必须在环境温度 -25°C 至 50°C 范围内运行。", metadata={"product_tag": "Dock3", "source": "Dock3_User_Manual.pdf"}),
#                 Document(page_content="Dock 3 内置TEC空调系统，确保存放温度适宜。", metadata={"product_tag": "Dock3", "source": "Dock3_Maintenance.pdf"})
#             ]
            
#         # Default Mock
#         return [
#             Document(page_content="[Mock] 这是一个通用的检索结果，因为系统运行在 Mock 模式。", metadata={"product_tag": "General", "source": "Mock_Data.txt"}),
#             Document(page_content="[Mock] RAG系统依赖未完全安装，启用降级服务。", metadata={"product_tag": "General", "source": "System_Info.txt"})
#         ]

#     def add_documents(self, documents: List[Document]):
#         if not self.mock_mode and self.vectorstore:
#             self.vectorstore.add_documents(documents)
#             if self.bm25: self._build_bm25_index()

# def pd_filter_check(doc: Document, tag: str) -> bool:
#     return not tag or doc.metadata.get('product_tag') == tag

# _kb = None
# def get_knowledge_base() -> KnowledgeBase:
#     global _kb
#     if _kb is None: _kb = KnowledgeBase()
#     return _kb
