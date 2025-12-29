"""
知识库构建脚本
处理大疆产品手册PDF并向量化到Chroma
"""
import os
import sys
from pathlib import Path
import logging

# 添加backend到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try importing KnowledgeBase Service (Should work now as it handles missing deps)
try:
    from services.knowledge_base import get_knowledge_base
except ImportError:
    logger.warning("Could not import get_knowledge_base. Using dummy.")
    def get_knowledge_base():
        class DummyKB:
            def search(self, *args, **kwargs): return []
            def add_documents(self, *args, **kwargs): pass
        return DummyKB()

# Optional LangChain Imports
try:
    from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    HAS_LIBS = True
except ImportError:
    HAS_LIBS = False
    logger.warning("LangChain libraries not found. Build will skip ingestion.")

# 产品文档路径（相对于项目根目录）
DOCS_PATH = "../../Project_Info"

# 产品映射
PRODUCT_MAPPING = {
    "Matrice_400": "M400",
    "Matrice30": "M30", 
    "Matrice_4D": "Dock3",
    "Dock_3": "Dock3",
    "D-RTK": "RTK",
    "DJI_Cellular": "Accessories",
    "DJI_AS1": "Accessories"
}

def detect_product_tag(filename: str) -> str:
    """从文件名检测产品标签"""
    for key, tag in PRODUCT_MAPPING.items():
        if key in filename:
            return tag
    return "General"

def detect_doc_type(filename: str) -> str:
    """从文件名检测文档类型"""
    filename_lower = filename.lower()
    if 'faq' in filename_lower:
        return 'faq'
    elif 'user_manual' in 'user manual' in filename_lower:
        return 'manual'
    elif 'maintenance' in filename_lower:
        return 'maintenance'
    elif 'installation' in filename_lower or 'setup' in filename_lower:
        return 'installation'
    elif 'safety' in filename_lower:
        return 'safety'
    else:
        return 'manual'

def build_knowledge_base():
    """构建知识库"""
    logger.info("🚀 开始构建知识库...")
    
    if not HAS_LIBS:
        logger.info("⚠️ 缺少依赖 (LangChain 等)，跳过实际构建。由于处于 Mock 开发模式，这是允许的。")
        return

    # 1. 获取文档路径
    docs_dir = Path(__file__).parent.parent / DOCS_PATH
    if not docs_dir.exists():
        logger.error(f"文档目录不存在: {docs_dir}")
        return
    
    # 2. 初始化向量库
    kb = get_knowledge_base()
    
    # 3. 文本分割器
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", "。", "，", " ", ""]
    )
    
    # 4. 处理所有文档
    all_documents = []
    file_count = 0
    
    for file_path in docs_dir.glob("**/*"):
        if not file_path.is_file():
            continue
        
        # 仅处理PDF、DOCX和TXT
        if file_path.suffix.lower() not in ['.pdf', '.docx', '.txt']:
            continue
        
        logger.info(f"📄 处理文件: {file_path.name}")
        
        try:
            # 加载文档
            if file_path.suffix.lower() == '.pdf':
                loader = PyPDFLoader(str(file_path))
            elif file_path.suffix.lower() == '.txt':
                # TXT文件直接读取
                from langchain_core.documents import Document
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                raw_docs = [Document(page_content=text, metadata={"source": str(file_path)})]
            else:
                loader = Docx2txtLoader(str(file_path))
            
            if file_path.suffix.lower() != '.txt':
                raw_docs = loader.load()
            
            # 检测产品和类型
            product_tag = detect_product_tag(file_path.name)
            doc_type = detect_doc_type(file_path.name)
            
            # 分块
            chunks = text_splitter.split_documents(raw_docs)
            
            # 添加元数据
            for chunk in chunks:
                chunk.metadata.update({
                    'source_file': file_path.name,
                    'product_tag': product_tag,
                    'doc_type': doc_type
                })
            
            all_documents.extend(chunks)
            file_count += 1
            logger.info(f"  ✅ 成功: {len(chunks)} 个文本块, 产品:{product_tag}, 类型:{doc_type}")
            
        except Exception as e:
            logger.error(f"  ❌ 失败: {e}")
            continue
    
    # 5. 批量添加到向量库
    if all_documents:
        logger.info(f"\n📊 共处理 {file_count} 个文件, {len(all_documents)} 个文本块")
        logger.info("🔄 正在向量化并存储到Chroma...")
        
        kb.add_documents(all_documents)
        
        logger.info("✅ 知识库构建完成！")
    else:
        logger.warning("⚠️  未找到任何文档")

def test_knowledge_base():
    """测试知识库检索"""
    logger.info("\n🧪 测试知识库检索...")
    
    kb = get_knowledge_base()
    
    # 测试查询
    test_queries = [
        ("Matrice 30的续航时间是多少？", "M30"),
        ("Dock 3如何安装？", "Dock3"),
        ("M400的保养周期", "M400"),
        ("RTK定位精度", "RTK")
    ]
    
    for query, product in test_queries:
        logger.info(f"\n查询: {query} (产品: {product})")
        results = kb.search(query, product_filter=product, top_k=2)
        
        if results:
            for i, doc in enumerate(results, 1):
                logger.info(f"  结果{i}: [{doc.metadata.get('product_tag')}] {doc.page_content[:100]}...")
        else:
            logger.warning("  未找到相关文档")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="构建大疆产品知识库")
    parser.add_argument('--test', action='store_true', help='测试知识库检索')
    args = parser.parse_args()
    
    if args.test:
        test_knowledge_base()
    else:
        build_knowledge_base()
        logger.info("\n💡 运行 'python build_kb.py --test' 测试检索")
