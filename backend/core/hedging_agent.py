"""
金融对冲专家 Agent Skills
为 CrewAI 或独立 Agent 提供对冲策略建议和风险分析的工具
"""
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from services.hedging_knowledge_base import (
    get_hedging_knowledge_base,
    CommodityType,
    HedgeProductType,
    RiskType,
    Jurisdiction
)

logger = logging.getLogger(__name__)


class HedgingStrategyAgent:
    """金融对冲策略智能体"""
    
    def __init__(self):
        self.kb = get_hedging_knowledge_base()
        logger.info("金融对冲策略 Agent 已初始化")
    
    def analyze_hedging_requirement(self, 
                                    exposure_details: Dict) -> Dict:
        """
        分析对冲需求并提出建议
        
        Args:
            exposure_details: 包含以下字段的字典
                - commodity: 商品类型 (e.g., "iron_ore", "crude_oil")
                - exposure_quantity: 敞口数量 (e.g., 100000 吨)
                - exposure_price: 当前或预期价格 (e.g., $120/吨)
                - time_horizon: 时间窗口 (e.g., "3_months", "6_months")
                - risk_tolerance: 风险容忍度 (e.g., "conservative", "moderate", "aggressive")
                - markets: 涉及市场 (e.g., ["Shanghai", "Rotterdam"])
                - description: 详细描述
        
        Returns:
            包含策略建议、成本估算、风险评分的字典
        """
        try:
            commodity = exposure_details.get("commodity")
            quantity = exposure_details.get("exposure_quantity", 0)
            price = exposure_details.get("exposure_price", 0)
            time_horizon = exposure_details.get("time_horizon", "3_months")
            risk_tolerance = exposure_details.get("risk_tolerance", "moderate")
            description = exposure_details.get("description", "")
            
            # 计算敞口价值
            exposure_value = quantity * price
            
            logger.info(f"分析对冲需求: {commodity} {quantity} @ ${price}, 敞口值 ${exposure_value}")
            
            # 搜索相关策略
            strategies = self.kb.search(
                query=f"{commodity} {description}",
                doc_type="strategy",
                top_k=5
            )
            
            # 搜索相关风险
            risk_docs = self.kb.search(
                query=f"{commodity} risk {risk_tolerance}",
                doc_type="risk_management",
                top_k=3
            )
            
            # 生成建议
            recommendations = self._generate_recommendations(
                commodity,
                quantity,
                price,
                exposure_value,
                risk_tolerance,
                strategies
            )
            
            return {
                "status": "success",
                "exposure_analysis": {
                    "commodity": commodity,
                    "quantity": quantity,
                    "unit_price": price,
                    "total_exposure_value": exposure_value,
                    "time_horizon": time_horizon,
                    "risk_tolerance": risk_tolerance
                },
                "recommended_strategies": recommendations,
                "risk_considerations": self._extract_risk_factors(risk_docs),
                "timestamp": datetime.now().isoformat(),
                "confidence": 0.85
            }
        
        except Exception as e:
            logger.error(f"对冲分析失败: {e}")
            return {
                "status": "error",
                "message": str(e),
                "confidence": 0.0
            }
    
    def _generate_recommendations(self,
                                   commodity: str,
                                   quantity: float,
                                   price: float,
                                   exposure_value: float,
                                   risk_tolerance: str,
                                   strategies: List[Dict]) -> List[Dict]:
        """生成对冲建议"""
        recommendations = []
        
        if not strategies:
            return recommendations
        
        # 根据风险容忍度调整对冲比例
        hedge_ratios = {
            "conservative": 0.9,  # 90% 对冲
            "moderate": 0.7,      # 70% 对冲
            "aggressive": 0.5     # 50% 对冲
        }
        hedge_ratio = hedge_ratios.get(risk_tolerance, 0.7)
        
        for i, strategy in enumerate(strategies[:3], 1):
            # 计算成本估算
            if "期货" in strategy["title"] or "futures" in strategy["title"].lower():
                cost_estimate = self._estimate_futures_cost(
                    commodity,
                    quantity * hedge_ratio,
                    exposure_value,
                    strategy
                )
            elif "期权" in strategy["title"] or "option" in strategy["title"].lower():
                cost_estimate = self._estimate_options_cost(
                    commodity,
                    quantity * hedge_ratio,
                    exposure_value,
                    strategy
                )
            else:
                cost_estimate = self._estimate_generic_cost(exposure_value, strategy)
            
            recommendation = {
                "rank": i,
                "strategy_name": strategy["title"],
                "strategy_id": strategy["doc_id"],
                "hedge_ratio": hedge_ratio,
                "hedged_quantity": quantity * hedge_ratio,
                "hedged_value": exposure_value * hedge_ratio,
                "hedge_tool": strategy["hedge_product_type"],
                "applicable_markets": strategy["applicable_markets"],
                "estimated_cost": cost_estimate,
                "cost_percentage": (cost_estimate / (exposure_value * hedge_ratio) * 100) if exposure_value > 0 else 0,
                "protection_scope": self._describe_protection(strategy),
                "implementation_steps": self._extract_implementation_steps(strategy["content"]),
                "risks_to_monitor": strategy["risk_types"],
                "compliance_notes": self._get_compliance_notes(strategy.get("jurisdiction"))
            }
            recommendations.append(recommendation)
        
        return recommendations
    
    def _estimate_futures_cost(self,
                                commodity: str,
                                hedge_quantity: float,
                                exposure_value: float,
                                strategy: Dict) -> float:
        """估算期货对冲成本"""
        # 简化估算：通常为敞口价值的 0.3-0.8%
        cost_percentage = 0.005  # 0.5%
        
        # 对于铁矿石，成本较低
        if "iron" in commodity.lower():
            cost_percentage = 0.003  # 0.3%
        elif "shipping" in commodity.lower() or "bdi" in commodity.lower():
            cost_percentage = 0.004  # 0.4%
        elif "oil" in commodity.lower():
            cost_percentage = 0.006  # 0.6%
        
        return exposure_value * hedge_quantity / exposure_value * cost_percentage if exposure_value > 0 else 0
    
    def _estimate_options_cost(self,
                                commodity: str,
                                hedge_quantity: float,
                                exposure_value: float,
                                strategy: Dict) -> float:
        """估算期权对冲成本（期权费）"""
        # 期权费通常为 1-5% 的敞口价值
        cost_percentage = 0.03  # 3%（中等）
        
        if "protection" in strategy["title"].lower() or "insurance" in strategy["title"].lower():
            cost_percentage = 0.035  # 看跌期权费较高
        
        return exposure_value * hedge_quantity / exposure_value * cost_percentage if exposure_value > 0 else 0
    
    def _estimate_generic_cost(self,
                                exposure_value: float,
                                strategy: Dict) -> float:
        """通用成本估算"""
        return exposure_value * 0.005  # 0.5% 默认成本
    
    def _describe_protection(self, strategy: Dict) -> str:
        """描述保护范围"""
        doc_type = strategy.get("doc_type", "")
        hedge_tool = strategy.get("hedge_product_type", "")
        
        if "期货" in strategy["title"] or hedge_tool == "futures":
            return "完全锁定价格，消除价格波动风险，但无向上收益"
        elif "期权" in strategy["title"] or hedge_tool == "options":
            return "下行保护，保留向上收益空间，但需支付期权费"
        else:
            return "基于具体合约的保护机制"
    
    def _extract_implementation_steps(self, content: str) -> List[str]:
        """从内容中提取实施步骤"""
        steps = []
        # 简单的提取逻辑，实际可用 NLP 改进
        if "步骤" in content or "Step" in content:
            lines = content.split("\n")
            for line in lines:
                if any(keyword in line for keyword in ["1.", "2.", "3.", "4.", "5.", "第一步", "第二步"]):
                    steps.append(line.strip())
        
        if not steps:
            steps = [
                "1. 评估敞口规模和时间窗口",
                "2. 查询交易所限仓规则和保证金要求",
                "3. 选择合适的合约月份和交割地点",
                "4. 分批建仓，避免市场冲击",
                "5. 建立日监控机制和风险告警"
            ]
        
        return steps
    
    def _get_compliance_notes(self, jurisdiction: Optional[str]) -> Dict:
        """获取合规说明"""
        compliance_map = {
            "cn": {
                "regulator": "中国期货业协会 / 大连商品交易所 (DCE)",
                "key_requirements": [
                    "套保申请需备案企业性质和采购合同",
                    "单客户非套保限仓通常为 200-500 手",
                    "套保持仓可申请提升至 5000+ 手",
                    "需每月更新套保备案"
                ],
                "reporting_frequency": "月度"
            },
            "sg": {
                "regulator": "新加坡金融管理局 (MAS) / SGX",
                "key_requirements": [
                    "敞口超过 $50M 需向监管机构报告",
                    "需遵守 MAS 交易商标准",
                    "定期更新交易对手信用评级"
                ],
                "reporting_frequency": "按规模"
            },
            "eu": {
                "regulator": "欧洲证券和市场管理局 (ESMA)",
                "key_requirements": [
                    "需遵守 EMIR 和 MiFID II 规范",
                    "交易需清算和报告",
                    "需维护充足资本金"
                ],
                "reporting_frequency": "日度/周度"
            },
            "us": {
                "regulator": "美国商品期货交易委员会 (CFTC)",
                "key_requirements": [
                    "大额交易者需注册为 CPO 或 CTA",
                    "需提交 Form 40-F 和其他监管报告",
                    "需遵守 Dodd-Frank 法案要求"
                ],
                "reporting_frequency": "日度/周度"
            }
        }
        
        return compliance_map.get(jurisdiction, {
            "regulator": "请根据实际司法管辖区咨询合规部门",
            "key_requirements": ["获取当地交易所和监管机构指南"],
            "reporting_frequency": "按当地要求"
        })
    
    def _extract_risk_factors(self, risk_docs: List[Dict]) -> List[Dict]:
        """提取风险因素"""
        risk_factors = []
        
        for doc in risk_docs:
            risk_factors.append({
                "risk_type": doc.get("doc_type", "risk_management"),
                "title": doc.get("title"),
                "key_points": doc.get("summary", ""),
                "mitigation_strategies": ["详见知识库文档"]
            })
        
        if not risk_factors:
            risk_factors.append({
                "risk_type": "operational",
                "title": "保证金与流动性风险",
                "key_points": "期货交易需维持足额保证金，市场波动时可能触发追缴",
                "mitigation_strategies": [
                    "预留 2 倍保证金缓冲",
                    "监控保证金使用率 < 70%",
                    "与银行协议快速融资渠道"
                ]
            })
        
        return risk_factors
    
    def get_crisis_response_guidance(self, crisis_type: str) -> Dict:
        """
        获取危机应对指导
        
        Args:
            crisis_type: 危机类型
                - "geopolitical": 地缘政治风险
                - "supply_chain": 供应链中断
                - "price_spike": 价格暴涨
                - "liquidity_crisis": 流动性危机
        
        Returns:
            包含应急响应步骤和策略的字典
        """
        try:
            # 搜索相关案例和指导
            guidance_docs = self.kb.search(
                query=crisis_type,
                doc_type="case_study",
                top_k=2
            )
            
            response_framework = self._build_crisis_response(crisis_type, guidance_docs)
            
            return {
                "status": "success",
                "crisis_type": crisis_type,
                "response_framework": response_framework,
                "reference_cases": guidance_docs,
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"危机应对指导生成失败: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def _build_crisis_response(self, crisis_type: str, docs: List[Dict]) -> Dict:
        """构建危机应对框架"""
        frameworks = {
            "geopolitical": {
                "phase_1": {
                    "timeframe": "立即（0-4 小时）",
                    "actions": [
                        "✓ 启动危机管理委员会",
                        "✓ 评估所有敞口（所有市场、所有商品）",
                        "✓ 获取最新地缘信息源",
                        "✓ 联系主要交易对手和经纪商"
                    ]
                },
                "phase_2": {
                    "timeframe": "短期（4-24 小时）",
                    "actions": [
                        "□ 量化风险敞口（使用压力测试）",
                        "□ 评估现有对冲的有效性",
                        "□ 识别额外对冲机会",
                        "□ 确保有充足流动性"
                    ]
                },
                "phase_3": {
                    "timeframe": "中期（1-7 天）",
                    "actions": [
                        "□ 执行对冲策略",
                        "□ 日监控基差和期货价格",
                        "□ 与客户沟通风险和成本影响",
                        "□ 调整现货采购和销售策略"
                    ]
                },
                "critical_tools": [
                    "期货对冲（快速执行，低成本）",
                    "期权买入（保留上行，付费保护）",
                    "远期合约锁定（完全对冲）"
                ]
            },
            "supply_chain": {
                "phase_1": {
                    "timeframe": "立即",
                    "actions": [
                        "✓ 确认关键供应链节点状态",
                        "✓ 评估替代路线可用性",
                        "✓ 统计已发货 vs 在途 vs 待发货"
                    ]
                },
                "phase_2": {
                    "timeframe": "短期",
                    "actions": [
                        "□ 评估额外成本（运费、保险、利息）",
                        "□ 对冲运费风险（BDI 期货）",
                        "□ 重新规划采购时间"
                    ]
                },
                "phase_3": {
                    "timeframe": "中期",
                    "actions": [
                        "□ 与客户协商成本分担",
                        "□ 调整合同条款"
                    ]
                },
                "critical_tools": [
                    "BDI 期货（运费对冲）",
                    "期权组合（灵活保护）"
                ]
            },
            "price_spike": {
                "phase_1": {
                    "timeframe": "立即",
                    "actions": [
                        "✓ 确认价格暴涨原因（供应冲击 vs 投机 vs 需求突增）",
                        "✓ 评估是否为暂时现象"
                    ]
                },
                "phase_2": {
                    "timeframe": "短期",
                    "actions": [
                        "□ 立即对冲风险敞口（优先期权保护）",
                        "□ 评估交易所涨跌停限制"
                    ]
                },
                "critical_tools": [
                    "看跌期权（获取下行保护）",
                    "期货做空（做反向对冲）"
                ]
            }
        }
        
        return frameworks.get(crisis_type, {
            "description": "未知危机类型，请咨询风控部门",
            "actions": ["评估敞口", "联系金融顾问"]
        })


# 工具函数，可供 CrewAI 或其他 Agent 框架调用
def hedging_strategy_tool(scenario: str, **details) -> str:
    """
    CrewAI-compatible hedging strategy tool
    
    Example:
        hedging_strategy_tool(
            scenario="analyze",
            commodity="iron_ore",
            exposure_quantity=100000,
            exposure_price=120,
            risk_tolerance="moderate"
        )
    """
    agent = HedgingStrategyAgent()
    
    if scenario == "analyze":
        result = agent.analyze_hedging_requirement(details)
    elif scenario == "crisis":
        crisis_type = details.get("crisis_type", "geopolitical")
        result = agent.get_crisis_response_guidance(crisis_type)
    else:
        result = {"error": f"Unknown scenario: {scenario}"}
    
    return json.dumps(result, ensure_ascii=False, indent=2, default=str)


def get_hedging_agent() -> HedgingStrategyAgent:
    """获取对冲策略 Agent 单例"""
    return HedgingStrategyAgent()
