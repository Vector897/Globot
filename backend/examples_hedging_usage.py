"""
金融对冲专家库使用示例脚本
演示如何调用对冲 Agent 和知识库
"""
import sys
from pathlib import Path

# 添加 backend 到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

import json
from datetime import datetime
from core.hedging_agent import get_hedging_agent
from services.hedging_knowledge_base import get_hedging_knowledge_base, CommodityType, RiskType


def print_header(title):
    """打印标题"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def example_1_analyze_iron_ore_hedging():
    """示例 1: 分析铁矿石采购对冲"""
    print_header("示例 1: 铁矿石采购敞口对冲分析")
    
    agent = get_hedging_agent()
    
    # 企业背景：中国钢铁企业，4月需要采购 10 万吨铁矿石
    exposure = {
        "commodity": "iron_ore",
        "exposure_quantity": 100000,  # 吨
        "exposure_price": 120,  # $/吨
        "time_horizon": "3_months",
        "risk_tolerance": "moderate",
        "markets": ["Shanghai", "Rotterdam"],
        "description": "4月进口铁矿石采购合同，需要锁定成本以保证利润"
    }
    
    print("\n📊 敞口信息：")
    print(f"   商品：{exposure['commodity']}")
    print(f"   数量：{exposure['exposure_quantity']:,} 吨")
    print(f"   单价：${exposure['exposure_price']}")
    print(f"   总敞口：${exposure['exposure_quantity'] * exposure['exposure_price']:,}")
    print(f"   时间窗口：{exposure['time_horizon']}")
    print(f"   风险容忍度：{exposure['risk_tolerance']}")
    
    print("\n⏳ 分析中...")
    result = agent.analyze_hedging_requirement(exposure)
    
    if result["status"] == "success":
        print("\n✅ 分析完成！\n")
        
        # 显示推荐策略
        strategies = result.get("recommended_strategies", [])
        for strategy in strategies[:1]:  # 只显示第一个推荐
            print(f"🎯 推荐策略 #{strategy['rank']}: {strategy['strategy_name']}")
            print(f"   对冲工具：{strategy['hedge_tool']}")
            print(f"   对冲比例：{strategy['hedge_ratio']*100:.0f}%")
            print(f"   对冲数量：{strategy['hedged_quantity']:,.0f} 吨")
            print(f"   对冲金额：${strategy['hedged_value']:,.0f}")
            print(f"   估计成本：${strategy['estimated_cost']:,.0f}")
            print(f"   成本占比：{strategy['cost_percentage']:.2f}%")
            print(f"   保护范围：{strategy['protection_scope']}")
            
            print(f"\n   📋 实施步骤：")
            for step in strategy.get("implementation_steps", [])[:3]:
                print(f"      {step}")
            
            print(f"\n   ⚠️ 风险监控：{', '.join(strategy.get('risks_to_monitor', []))}")
            
            print(f"\n   📜 合规要求（{strategy['compliance_notes'].get('regulator')})：")
            for req in strategy['compliance_notes'].get('key_requirements', [])[:2]:
                print(f"      • {req}")
    else:
        print(f"\n❌ 分析失败: {result.get('message')}")


def example_2_search_knowledge():
    """示例 2: 搜索对冲知识库"""
    print_header("示例 2: 知识库搜索 - 查找基差风险管理")
    
    kb = get_hedging_knowledge_base()
    
    print("\n🔍 搜索关键词：'基差风险'")
    results = kb.search(
        query="基差风险",
        doc_type="risk_management",
        top_k=3
    )
    
    print(f"\n📚 找到 {len(results)} 份相关文档：\n")
    
    for doc in results[:1]:  # 只显示第一个
        print(f"📄 标题：{doc['title']}")
        print(f"   来源：{doc['source']} (版本 {doc['version']})")
        print(f"   相关度：{doc['relevance_score']:.2f}")
        print(f"   标签：{', '.join(doc['tags'])}")
        print(f"\n   摘要：{doc['summary'][:150]}...")
        print(f"\n   内容预览：")
        preview = doc['content'][:300].replace('\n', '\n   ')
        print(f"   {preview}...")


def example_3_scenario_strategy():
    """示例 3: 根据场景获取对冲策略"""
    print_header("示例 3: 预定义场景 - 运费成本锁定")
    
    kb = get_hedging_knowledge_base()
    
    print("\n🚢 场景：国际贸易企业需要锁定海运费成本")
    print("   从上海运铁矿石到鹿特丹，担心红海迂回增加运费...")
    
    strategies = kb.get_strategy_by_scenario("shipping_cost_lock")
    
    print(f"\n📋 推荐策略 ({len(strategies)} 个)：\n")
    
    for strategy in strategies[:1]:
        print(f"✅ {strategy['title']}")
        print(f"   对冲工具：{strategy['hedge_product_type']}")
        print(f"   适用市场：{', '.join(strategy['applicable_markets'])}")
        print(f"   司法区：{strategy['jurisdiction']}")
        print(f"\n   {strategy['summary']}")


def example_4_crisis_response():
    """示例 4: 地缘危机应急响应"""
    print_header("示例 4: 危机应对 - 红海地缘政治风险")
    
    agent = get_hedging_agent()
    
    print("\n🚨 危机场景：胡塞武装在红海袭击船只，航线迂回导致运费暴涨")
    print("   影响：国际运费增加 50%-80%")
    print("   敞口：月度 4 万吨铁矿石进口")
    
    print("\n⏳ 生成危机应对方案...")
    
    crisis_guidance = agent.get_crisis_response_guidance("geopolitical")
    
    if crisis_guidance["status"] == "success":
        print("\n✅ 应急响应框架：\n")
        
        framework = crisis_guidance["response_framework"]
        
        # 显示第一阶段
        phase = framework.get("phase_1", {})
        print(f"🔴 {phase.get('timeframe')}（立即响应）")
        for action in phase.get("actions", [])[:3]:
            print(f"   {action}")
        
        print(f"\n💡 关键对冲工具：{', '.join(framework.get('critical_tools', [])[:2])}")


def example_5_kb_stats():
    """示例 5: 知识库统计"""
    print_header("示例 5: 知识库统计信息")
    
    kb = get_hedging_knowledge_base()
    
    print(f"\n📊 知识库统计：")
    print(f"   总文档数：{len(kb.documents)}")
    
    # 统计文档类型
    doc_types = {}
    commodities = set()
    for doc in kb.documents.values():
        doc_types[doc.doc_type] = doc_types.get(doc.doc_type, 0) + 1
        commodities.add(doc.commodity_type.value)
    
    print(f"\n   📚 按类型分布：")
    for doc_type, count in sorted(doc_types.items()):
        print(f"      {doc_type}: {count} 份")
    
    print(f"\n   🏪 覆盖商品：{', '.join(sorted(commodities))}")
    
    print(f"\n   ✅ 系统状态：正常")


def example_6_complete_workflow():
    """示例 6: 完整对冲工作流"""
    print_header("示例 6: 完整对冲决策工作流")
    
    agent = get_hedging_agent()
    kb = get_hedging_knowledge_base()
    
    print("\n📋 场景：油品贸易企业面临原油库存价格风险\n")
    
    # 步骤 1：评估敞口
    print("【步骤 1】评估敞口")
    exposure = {
        "commodity": "crude_oil",
        "exposure_quantity": 50000,  # 桶
        "exposure_price": 85,  # $/桶
        "time_horizon": "6_months",
        "risk_tolerance": "conservative",
        "description": "库存 50,000 桶原油，担心油价下跌"
    }
    print(f"   敞口：{exposure['exposure_quantity']:,} 桶 @ ${exposure['exposure_price']}/桶")
    print(f"   总价值：${exposure['exposure_quantity'] * exposure['exposure_price']:,}")
    print(f"   风险容忍度：{exposure['risk_tolerance']}")
    
    # 步骤 2：查找相关策略
    print("\n【步骤 2】查找相关对冲策略")
    strategies = kb.search("原油期权保险", doc_type="strategy", top_k=2)
    if strategies:
        print(f"   找到 {len(strategies)} 个相关策略")
        for i, s in enumerate(strategies, 1):
            print(f"   {i}. {s['title']}")
    
    # 步骤 3：获取专家建议
    print("\n【步骤 3】获取对冲专家建议")
    result = agent.analyze_hedging_requirement(exposure)
    if result["status"] == "success":
        strategy = result["recommended_strategies"][0]
        print(f"   ✅ 推荐：{strategy['strategy_name']}")
        print(f"   成本：${strategy['estimated_cost']:,.0f} ({strategy['cost_percentage']:.2f}%)")
        print(f"   保护：{strategy['protection_scope']}")
    
    # 步骤 4：风险检查
    print("\n【步骤 4】风险检查清单")
    risk_docs = kb.search("原油流动性保证金", doc_type="risk_management", top_k=2)
    print(f"   • 流动性风险：{risk_docs[0]['title'] if risk_docs else '需要检查'}")
    print("   • 保证金准备：预留 2 倍保证金缓冲")
    print("   • 合规审批：咨询风控/法务部门")
    
    # 步骤 5：执行
    print("\n【步骤 5】执行清单")
    print("   ✓ 确认交易商和经纪商")
    print("   ✓ 准备保证金资金")
    print("   ✓ 建立日监控机制")
    print("   ✓ 设置风险告警阈值")


# ============ 主程序 ============

if __name__ == "__main__":
    print("\n" + "🔥 "*10)
    print("金融衍生品对冲专家库 - 使用示例")
    print("🔥 "*10)
    
    try:
        # 运行示例
        example_1_analyze_iron_ore_hedging()
        example_2_search_knowledge()
        example_3_scenario_strategy()
        example_4_crisis_response()
        example_5_kb_stats()
        example_6_complete_workflow()
        
        # 总结
        print_header("✨ 示例完成")
        print("""
📚 知识库功能：
   ✓ 对冲需求分析 - 智能推荐最优对冲策略
   ✓ 知识库搜索 - 查找相关对冲文档和指南
   ✓ 场景对冲策略 - 预定义的常见业务场景
   ✓ 危机应急响应 - 地缘政治等突发事件应对
   ✓ 合规指导 - 不同市场的监管要求

🚀 下一步：
   1. 启动 API 服务：python start_server.py
   2. 访问 API 文档：http://localhost:8000/docs
   3. 集成到 Agent：from core.hedging_agent import get_hedging_agent
   4. 前端调用 API：/api/v2/hedging/* 端点

📖 详细文档：
   ./对冲专家库使用指南.md
        """)
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
