"""
RAG 系统升级测试脚本
测试元数据过滤、混合检索、重排序等功能
"""
import sys
sys.path.append('.')

from services.enhanced_knowledge_base import get_enhanced_knowledge_base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_rag_upgrade():
    """测试 RAG 升级功能"""
    print("="*60)
    print("RAG 系统升级测试")
    print("="*60)
    
    # 初始化增强知识库
    print("\n[1] 初始化增强知识库...")
    kb = get_enhanced_knowledge_base()
    print("✅ 知识库初始化完成")
    
    # 测试用例
    test_cases = [
        {
            "name": "RTK 大乱斗测试（实体消歧能力）",
            "query": "RTK怎么装？",
            "expected": "AI应该反问机型或场景"
        },
        {
            "name": "参数冲突测试（精准检索）",
            "query": "M30的维护周期是多久？",
            "expected": "应该返回100小时（不是200架次或6个月）"
        },
        {
            "name": "M400 具体查询",
            "query": "M400 的电池怎么保养？",
            "expected": "只返回M400相关内容，不混淆M30或Dock3"
        },
        {
            "name": "Dock 3 系统查询",
            "query": "Dock 3 怎么安装？",
            "expected": "返回完整安装流程"
        },
        {
            "name": "专有名词测试",
            "query": "BS30 电池箱怎么充电？",
            "expected": "精准匹配BS30"
        }
    ]
    
    print("\n"+"="*60)
    print("开始测试...")
    print("="*60)
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n[测试 {i}] {test['name']}")
        print(f"查询: {test['query']}")
        print(f"期望: {test['expected']}")
        print("-"*60)
        
        try:
            # 测试增强检索
            docs = kb.search(
                test['query'],
                top_k=3,
                use_hybrid=True,
                use_rerank=True
            )
            
            print(f"✅ 检索到 {len(docs)} 个文档")
            
            for j, doc in enumerate(docs, 1):
                product = doc.metadata.get('product_tag', '未知')
                doc_type = doc.metadata.get('doc_type', '文档')
                content_preview = doc.page_content[:150].replace('\n', ' ')
                
                print(f"\n  文档 {j}:")
                print(f"    产品: {product}")
                print(f"    类型: {doc_type}")
                print(f"    内容: {content_preview}...")
            
        except Exception as e:
            print(f"❌ 测试失败: {e}")
        
        print()
    
    # 产品检测测试
    print("\n"+"="*60)
    print("[附加测试] 产品自动检测")
    print("="*60)
    
    detection_tests = [
        ("M30 续航多久？", "M30"),
        ("Dock 3 支持多少台无人机？", "Dock3"),
        ("M400 的载重是多少？", "M400"),
        ("D-RTK 2 怎么设置？", "RTK")
    ]
    
    for query, expected_product in detection_tests:
        detected = kb.detect_product(query)
        status = "✅" if detected == expected_product else "❌"
        print(f"{status} \"{query}\" -> 检测: {detected}, 期望: {expected_product}")
    
    print("\n"+"="*60)
    print("测试完成！")
    print("="*60)

if __name__ == "__main__":
    test_rag_upgrade()
