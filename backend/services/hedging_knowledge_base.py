"""
金融衍生品与大宗商品对冲专家库
专注于对冲策略、风险管理、产品规格和合规指南
"""
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class HedgeProductType(str, Enum):
    """对冲产品类型"""
    FUTURES = "futures"  # 期货
    OPTIONS = "options"  # 期权
    SWAPS = "swaps"      # 掉期
    FORWARDS = "forwards"  # 远期合约


class CommodityType(str, Enum):
    """大宗商品类型"""
    IRON_ORE = "iron_ore"  # 铁矿石
    CRUDE_OIL = "crude_oil"  # 原油
    COPPER = "copper"  # 铜
    WHEAT = "wheat"  # 小麦
    SHIPPING = "shipping"  # 海运费（BDI）
    ENERGY = "energy"  # 能源综合


class RiskType(str, Enum):
    """风险类型"""
    PRICE = "price"  # 价格风险
    BASIS = "basis"  # 基差风险
    LIQUIDITY = "liquidity"  # 流动性风险
    COUNTERPARTY = "counterparty"  # 交易对手风险
    OPERATIONAL = "operational"  # 运营风险
    GEOPOLITICAL = "geopolitical"  # 地缘政治风险


class Jurisdiction(str, Enum):
    """司法管辖区"""
    US = "us"  # 美国
    EU = "eu"  # 欧盟
    CN = "cn"  # 中国
    SG = "sg"  # 新加坡
    HK = "hk"  # 香港
    GLOBAL = "global"  # 全球通用


@dataclass
class HedgeDocument:
    """对冲知识文档"""
    doc_id: str
    title: str
    content: str
    doc_type: str  # 'strategy', 'product_spec', 'compliance', 'case_study', 'risk_management'
    commodity_type: CommodityType
    hedge_product_type: HedgeProductType
    risk_types: List[RiskType]
    jurisdiction: Jurisdiction
    applicable_markets: List[str]  # 如 ['Shanghai', 'Rotterdam', 'Busan']
    effective_date: datetime
    expiry_date: Optional[datetime]
    confidentiality_level: str  # 'public', 'internal', 'sensitive'
    tags: List[str]
    source: str  # 文档来源
    version: str
    summary: str


class HedgingExpertKnowledgeBase:
    """金融对冲专家库 - 包含策略、规则、案例和合规指南"""
    
    def __init__(self):
        self.documents: Dict[str, HedgeDocument] = {}
        self._init_core_knowledge()
        logger.info("金融对冲专家库已初始化")
    
    def _init_core_knowledge(self):
        """初始化核心对冲知识库"""
        
        # ============== 1. 期货对冲策略 ==============
        self._add_document(HedgeDocument(
            doc_id="strategy_001",
            title="铁矿石期货对冲基础策略",
            content="""
## 铁矿石期货对冲策略

### 适用场景
- 钢铁企业面临原料成本上升风险
- 贸易商持有库存面临价格下跌风险
- 供应链长周期采购需要成本锁定

### 策略步骤
1. **敞口评估**：确定采购量、价格基准、时间窗口
   - 月度采购量：X万吨
   - 预期价格：$Y/吨
   - 套保比例：80%~100%（保守）
   
2. **合约选择**
   - 交易所：大连商品交易所（DCE）/ 新加坡铁矿石期货（SGX）
   - 合约月份：选择流动性最好的合约（通常是当月或下月）
   - 合约规模：I2403 (100吨/手)
   
3. **头寸建立**
   - 买入期货合约（做多对冲）
   - 数量计算：采购量 / 合约乘数
   - 分批建仓：避免单次大额冲击市场
   
4. **风险监控**
   - 每日跟踪基差变化 = 现货价 - 期货价
   - 设置止损点：基差异常扩大时（>$5/吨）
   - 保证金预警：维持充足流动性（2倍保证金）

### 成本测算
- 交易手续费：0.5~2元/手 × 手数
- 保证金占用：5%~10% × 敞口价值
- 基差风险：±$2-5/吨（市场驱动）

### 关键参数
| 参数 | 值 | 备注 |
|------|-----|------|
| 套保比例 | 80%-100% | 完全对冲降低收益但保证成本稳定 |
| 基差容忍度 | ±$3/吨 | 超过范围考虑减仓或增持 |
| 保证金率 | 10% | DCE 铁矿石期货 |
| 合约乘数 | 100吨 | 1手 = 100吨 |
| 交割月份 | 当月或次月 | 优选流动性强合约 |

### 案例：供应链危机对冲
- 时间：2024年红海危机
- 敞口：月度采购 10万吨铁矿石
- 对冲方案：I2403 期货 1000手（10万吨）
- 结果：现货价上升$8/吨，期货盈利 $800,000，成本锁定成功
            """,
            doc_type="strategy",
            commodity_type=CommodityType.IRON_ORE,
            hedge_product_type=HedgeProductType.FUTURES,
            risk_types=[RiskType.PRICE, RiskType.BASIS],
            jurisdiction=Jurisdiction.CN,
            applicable_markets=["Shanghai", "Dalian", "Singapore"],
            effective_date=datetime(2024, 1, 1),
            expiry_date=None,
            confidentiality_level="public",
            tags=["iron_ore", "futures", "supply_chain", "cost_lock"],
            source="内部风控手册 v2.3",
            version="2.3",
            summary="通过大连商品交易所期货合约对冲铁矿石采购成本，适用于钢铁及贸易企业"
        ))
        
        # ============== 2. 期权对冲策略 ==============
        self._add_document(HedgeDocument(
            doc_id="strategy_002",
            title="原油看跌期权保险策略",
            content="""
## 原油看跌期权保险对冲

### 适用场景
- 石化企业持有原油库存
- 担心短期内油价暴跌
- 想保留向上获利空间，只对冲下行风险

### 策略：买入看跌期权 (Long Put)

### 合约参数
- 标的：布伦特原油期货 (ICE Brent Crude)
- 执行价：$85/桶 (行权价，设置在预期风险点位)
- 到期时间：3个月 (90 DTE)
- 期权费：约 $3.5/桶 (市场报价)

### 成本效益分析
| 场景 | 现货价格 | 期权损益 | 净保护成本 | 财务结果 |
|------|---------|---------|----------|---------|
| 油价上升 | $95/桶 | -$350 (期权费) | -$350 | 现货赚$1000，期权亏$350，净赚$650 |
| 油价不变 | $87.5/桶 | -$350 | -$350 | 成本$350保护成本 |
| 油价下跌 | $80/桶 | +$500 | +$150 | 现货亏$750，期权赚$500，仅亏$250 |

### 风险管理要点
1. **Vega风险**：隐含波动率下降会侵蚀期权价值
   - 对冲方案：组合波动率掉期，锁定 IV
   
2. **Theta衰减**：接近到期时加速时间衰减
   - 监控周期：每周检查剩余时间价值
   - 调整策略：考虑 roll forward（展期）到更远月份
   
3. **流动性风险**：期权合约可能难以快速平仓
   - 选择大合约，如 ICE Brent (1000桶/手)

### 执行清单
- ✓ 确认敞口量：库存多少桶
- ✓ 选择执行价：选在预警价格
- ✓ 购买期权：通过经纪商下单
- ✓ 监控 Greeks：日跟踪 delta, gamma, vega, theta
- ✓ 到期前 2 周：决定是否 roll forward 或平仓
            """,
            doc_type="strategy",
            commodity_type=CommodityType.CRUDE_OIL,
            hedge_product_type=HedgeProductType.OPTIONS,
            risk_types=[RiskType.PRICE, RiskType.LIQUIDITY],
            jurisdiction=Jurisdiction.GLOBAL,
            applicable_markets=["ICE", "CME", "Intercontinental Exchange"],
            effective_date=datetime(2024, 1, 1),
            expiry_date=None,
            confidentiality_level="public",
            tags=["crude_oil", "options", "put_spread", "insurance"],
            source="期权风险管理指南 v1.2",
            version="1.2",
            summary="通过购买看跌期权为原油库存提供下行保护，保留上行收益"
        ))
        
        # ============== 3. 海运费对冲 ==============
        self._add_document(HedgeDocument(
            doc_id="strategy_003",
            title="海运费指数对冲（BDI）策略",
            content="""
## 波罗的海干散货指数 (BDI) 对冲

### 背景
- BDI 反映全球海运干散货需求（铁矿、煤、粮食等）
- 适用于国际贸易企业面临运费成本变动
- 可用期货：新加坡交易所 (SGX) 的 Baltic Freight Forward Contracts

### 风险场景
- **长期现货敞口**：已确定采购/销售合同，但运费未定
- **地缘风险**：红海危机导致迂回绕行，运费涨价
- **需求波动**：全球贸易量不确定性导致运费波动

### 对冲方案：BDI 期货合约

#### 合约规格 (SGX Baltic Freight Forward)
- 标的指数：波罗的海干散货指数 (BDI)
- 点数价值：$1/点
- 合约乘数：100点 = $100
- 最小变动价位：0.5点 = $50
- 交割月份：现货月 + 后续月份

#### 数量计算
示例：4 月从上海运铁矿到鹿特丹
- 船运量：40,000 吨
- 平均运费率：$12/吨（基于 BDI ÷ Worldscale）
- 运费总敞口：$480,000
- BDI 当前点数：1500
- **对冲合约数量**：480,000 / (1500 × $1) ≈ 320 手

#### 执行步骤
1. 确认敞口时间、区间和金额
2. 计算对应 BDI 点数等价敞口
3. 买入相应月份 BDI 期货合约
4. 每日跟踪并调整（基于实际现货价格变化）
5. 当现货交付或运费定价时平仓期货

### 成本结构
| 项目 | 成本 |
|------|------|
| 交易手续费 | SGX: $50~100 per contract per side |
| 保证金 (初始) | 500~1000 USD per contract |
| 期货价差损失 | 基差变化影响，通常±$20-50 per contract |

### 关键监控指标
- **现货运费 vs 期货价差**：追踪基差变化
- **VRP (Volatility Risk Premium)**：期权隐含波动 vs 实现波动
- **交割风险**：到期前 2 周评估是否需要 roll forward

### 合规与交易对手风险
- 确保交易商有 SGX 清算授权
- 保证金追缴机制：维持 150% 维持保证金
- 监管报告：定期向风控/合规报告敞口
            """,
            doc_type="strategy",
            commodity_type=CommodityType.SHIPPING,
            hedge_product_type=HedgeProductType.FUTURES,
            risk_types=[RiskType.PRICE, RiskType.GEOPOLITICAL, RiskType.OPERATIONAL],
            jurisdiction=Jurisdiction.SG,
            applicable_markets=["Singapore", "Shanghai", "Rotterdam"],
            effective_date=datetime(2024, 1, 1),
            expiry_date=None,
            confidentiality_level="public",
            tags=["shipping", "bdi", "freight", "supply_chain"],
            source="海运对冲操作手册 v1.0",
            version="1.0",
            summary="通过新加坡交易所 BDI 期货对冲国际运费成本，适用于进出口贸易企业"
        ))
        
        # ============== 4. 基差风险管理 ==============
        self._add_document(HedgeDocument(
            doc_id="risk_001",
            title="基差风险识别与管理框架",
            content="""
## 基差风险（Basis Risk）管理

### 定义
基差 = 现货价格 - 期货价格

### 为什么存在基差？
1. **区域差异**：不同地区交割位置价格不同
   - 例：大连 I2403 期货 $120/吨 vs 澳洲现货 $116/吨
   
2. **品质差异**：实际商品品质与期货合约标准差异
   - 铁矿石：品味、杂质率不同
   - 原油：API 度、硫含量不同
   
3. **时间差异**：期货合约到期与实际敞口处理时间不同
   - 期货 3 月交割，但现货 5 月才完全清空
   
4. **季节性**：不同季节供需变化

### 基差风险量化
基差波动标准差：±$2.5/吨（以过去 1 年为例）
- 置信度 95%：基差范围在 $5/吨 以内

### 对冲效果
假设采购 1 万吨（敞口 $120万）：
- 不对冲：价格变化 ±$10/吨 → 利润变化 ±$10万
- 完全对冲：基差变化 ±$2.5/吨 → 利润变化 ±$2.5万（降低 75%）

### 基差监控清单
```
每日追踪：
□ 现货价格 vs 期货价格（主力合约）
□ 基差变化幅度
□ 异常信号（基差扩大超过 2 个标准差）
□ 交割期临近的价差收敛情况
```

### 基差异常处理
| 基差变化 | 信号 | 处理方案 |
|---------|------|--------|
| 基差快速扩大 (>$5/吨/天) | 地缘或供应链冲击 | 考虑减仓 30%，转向期权保险 |
| 基差持续负值扩大 | 现货弱，期货强 | 评估平仓时间，或增持期货 |
| 到期前基差异常 | 交割压力或套利机制失效 | 提前 2 周平仓避免交割 |

### 最佳实践
1. 选择基差相对稳定的品种和交割点
2. 定期（每周）回测基差历史统计
3. 建立基差预警系统（自动告警）
4. 与期货公司沟通，获取官方交割仓库信息
            """,
            doc_type="risk_management",
            commodity_type=CommodityType.IRON_ORE,
            hedge_product_type=HedgeProductType.FUTURES,
            risk_types=[RiskType.BASIS, RiskType.PRICE],
            jurisdiction=Jurisdiction.GLOBAL,
            applicable_markets=["Dalian", "Shanghai", "Singapore"],
            effective_date=datetime(2024, 1, 1),
            expiry_date=None,
            confidentiality_level="public",
            tags=["basis_risk", "futures", "monitoring"],
            source="风险管理框架 v2.1",
            version="2.1",
            summary="识别、量化和管理期现对冲中的基差风险"
        ))
        
        # ============== 5. 流动性与保证金风险 ==============
        self._add_document(HedgeDocument(
            doc_id="risk_002",
            title="保证金与流动性风险应对",
            content="""
## 保证金与流动性风险

### 保证金要求
期货交易需要缴纳初始保证金和维持保证金。

#### 铁矿石期货 (DCE I)
- 初始保证金率：10%
- 维持保证金率：8%
- 价格波动 2%：保证金 ±$4,000/手（假设合约价 $100×100吨）

#### 原油期货 (INE SC)
- 初始保证金率：12%
- 维持保证金率：10%
- 日均涨幅容易触发追缴

### 流动性风险场景

#### 场景 1：合约交割月临近
- 问题：越接近交割月，期货合约流动性下降
- 影响：买卖价差（spread）扩大 5-20 倍
- 对策：提前 4 周转仓（roll forward）到下月合约

#### 场景 2：地缘危机导致市场黑天鹅
- 问题：交易所可能关闭或限价
- 例子：2022 俄乌冲突，铝、镍期货暂停交易
- 对策：
  1. 保持充足流动性（保证金比例 >= 150%）
  2. 与交易商事先签署应急条款
  3. 多家经纪商分散敞口

#### 场景 3：保证金追缴
```
事件流：
Day 1: 油价突跌 3% → 保证金 alert (-$30,000)
Day 2: 继续跌 2% → 保证金追缴提醒 (-$20,000)
Day 3: 再跌 2% → 强制平仓风险 (维持保证金不足)

应对：
□ 准备备用资金 (事前)
□ 设置自动转账指令 (应急)
□ 与财务部门沟通资金可用性
```

### 保证金管理最佳实践
1. **事前准备**
   - 估算最大可能保证金需求（基于 3σ 价格变动）
   - 预留至少 2 倍应缴保证金作为现金缓冲
   
2. **日常监控**
   - 实时跟踪保证金使用率 (当日敞口 / 可用资金)
   - 设置预警阈值：使用率 > 80% 时报警
   
3. **转仓操作**
   - 提前 20 天开始转仓（从近月到远月）
   - 分批转仓：避免单日冲击
   
4. **应急预案**
   - 与银行/贷款方协议快速融资渠道
   - 制定强制平仓清单（哪些合约优先平）

### 监控仪表板
```
每日检查项：
□ 保证金使用率 (当前 / 初始) < 70%
□ 期货敞口 vs 期货合约浮动亏损 < -5%
□ 下周转仓日期确认
□ 交易所通知（限价、交割提示）
```
            """,
            doc_type="risk_management",
            commodity_type=CommodityType.CRUDE_OIL,
            hedge_product_type=HedgeProductType.FUTURES,
            risk_types=[RiskType.LIQUIDITY, RiskType.OPERATIONAL],
            jurisdiction=Jurisdiction.GLOBAL,
            applicable_markets=["Shanghai", "Dalian", "Singapore"],
            effective_date=datetime(2024, 1, 1),
            expiry_date=None,
            confidentiality_level="internal",
            tags=["liquidity", "margin", "operational_risk"],
            source="资金风险管理指南 v1.5",
            version="1.5",
            summary="识别和管理期货交易中的保证金追缴和流动性风险"
        ))
        
        # ============== 6. 合规与交易所规则 ==============
        self._add_document(HedgeDocument(
            doc_id="compliance_001",
            title="期货交易合规与交易所限仓规则",
            content="""
## 交易所限仓与交易合规

### 中国（大连商品交易所 DCE）
#### 铁矿石期货 (I) 限仓规则
- **单客户非套保限仓**：200 手
- **单客户套保（若已备案）**：可申请额度提升至 5000 手+
- **交易所总持仓**：不超过 30 万手

#### 套保申请流程
```
1. 备案前提条件：
   - 企业性质：注册生产经营企业或贸易商
   - 提交证明：营业执照、采购销售合同副本、仓库证明
   
2. 套保持仓证明
   - 提交格式：铁矿石月度进口计划表（包含数量、时间、价格预期）
   - 更新频率：每月更新或异常变更时及时通知
   
3. 交易所评审
   - DCE 风控部门评审（通常 3-5 工作日）
   - 批准后，单客户限仓自动提升
```

#### 风险监管措施
- 涨跌停触发自动限价
  - 开仓数量限制：当日涨跌停幅 ±5%
  - 持仓限制：超过 1000 手时，新开数量 <= 上一日的 10%

#### 交易所通知示例
```
【提醒】铁矿石 I2401 合约近月效应触发
- 交割月前 15 日，限仓比例从 20% 降至 10%
- 建议交易商提前 1 个月进行转仓或交割安排
```

### 新加坡 (SGX) - 国际市场
#### BDI 期货限仓（无特殊限制）
- 非市场参与者：无硬性限仓
- 但实际上市场流动性决定了单一交易商的有效敞口

#### EMIR / MiFID II 报告要求 (欧盟)
- 敞口超过 $50M 需向监管机构报告
- 报告内容：交易商身份、敞口规模、交易目的（套保或投机）

### 禁止行为（必须合规）
1. **市场操纵**：不允许故意扭曲价格
2. **虚假交易**：对倒、点价等被禁
3. **内幕交易**：利用未公开信息交易
4. **信息披露**：大敞口需及时主动报告

### 监控表格

| 交易所 | 产品 | 套保限额 | 非套保限额 | 报告要求 | 交割提示 |
|--------|------|--------|---------|--------|--------|
| DCE | 铁矿石 I | 5000 手+ | 200 手 | 月度更新 | 前 15 日 |
| INE | 原油 SC | 10000 手+ | 500 手 | 周报 | 前 10 日 |
| SGX | BDI | 无限制 | 无限制 | 月报 (>$50M) | 前 5 日 |

### 合规检查清单
```
每月初始化：
□ 确认套保备案是否有效（有效期通常为 1 年）
□ 当前持仓 vs 套保备案敞口对比
□ 下月套保额度预估 & 提前申请
□ 前月交易报告生成与存档

每周跟踪：
□ 当前持仓 vs 限仓规则检查
□ 涨跌停提醒确认
□ 合约转仓时间确认
□ 交易所通知审阅

交割前 20 天：
□ 确认是否进行物理交割或现金交割
□ 交割商品验收准备
□ 或提前规划转仓至下一合约月份
```
            """,
            doc_type="compliance",
            commodity_type=CommodityType.IRON_ORE,
            hedge_product_type=HedgeProductType.FUTURES,
            risk_types=[RiskType.OPERATIONAL],
            jurisdiction=Jurisdiction.CN,
            applicable_markets=["Dalian", "Shanghai", "Singapore"],
            effective_date=datetime(2024, 1, 1),
            expiry_date=None,
            confidentiality_level="internal",
            tags=["compliance", "regulatory", "position_limits"],
            source="合规与交易所规则手册 v2.2",
            version="2.2",
            summary="大连商品交易所和国际交易所的限仓规则、套保申请流程和合规要求"
        ))
        
        # ============== 7. 地缘危机应急对冲 ==============
        self._add_document(HedgeDocument(
            doc_id="case_001",
            title="红海危机应急对冲案例研究",
            content="""
## 2024 红海危机对冲案例

### 背景与风险
- **时间**：2024 年 1 月中旬
- **事件**：胡塞武装在红海袭击商业船只
- **影响**：航线迂回，从苏伊士运河绕行非洲好望角
- **运费变化**：上升 $8-12/吨（增加 50-80%）
- **客户敞口**：上海某贸易商有 4 月鹿特丹交割合同，采购成本被动上升

### 对冲决策流程

#### 第 1 步：敞口评估 (Day 1 - 2024/1/15)
```
采购合同信息：
- 商品：铁矿石 10 万吨
- 原定运费：$12/吨（已固定）
- 当前现状：物流商要求加价 $10/吨（迂回成本）
- 现货价：$120/吨（稳定）
- 潜在损失：100,000 × $10 = $100 万人民币
- 合同方：长期客户，无法转嫁成本
```

#### 第 2 步：对冲工具选择 (Day 2 - 2024/1/16)
选项分析：
| 工具 | 成本 | 保护范围 | 适用性 |
|------|------|--------|--------|
| BDI 期货 | $500 手续费 | 部分（~70%) | ⭐⭐⭐ 推荐 |
| 原油期货 | 较高保证金 | 间接 | ⭐ 相关性弱 |
| 远期运费合约 | 需谈判 | 100% | ⭐⭐ 需时间 |

**决策**：买入 BDI 期货合约，按 70% 对冲比例

#### 第 3 步：合约计算 (Day 2)
```
运费总敞口计算：
- 实际运费成本：$100万（$10/吨 × 10万吨）
- BDI 对冲有效性：约 70%（因为 BDI 是综合指数，不完全对应铁矿石）
- 对冲规模：$70万 ÷ (BDI 点数 1500 × $100) ≈ 47 手

执行价格：
- 当时 BDI：1500 点
- 期货价格：≈ $150,000 (1500 × $100)
- 合约数量：47 手

成本：
- 保证金：47 × $1,000 = $47,000
- 手续费：47 × $100 = $4,700
- 小计：约 $52,000
```

#### 第 4 步：执行与监控 (Day 3 - 持续)
```
建仓后日跟踪：
2024/1/16: BDI 买入 47 手 @ 1500 点，成本 $152,000
2024/1/20: BDI 下跌至 1450 点，账面亏损 -$2,350
2024/1/25: BDI 反弹至 1480 点，账面亏损 -$940
2024/1/30: BDI 上升至 1550 点，账面盈利 +$2,350
2024/2/15: 现货交割期近，实际运费敲定 $18/吨 (较预期低)
           BDI 期货价格 1520 点，账面盈利 +$940
           期货平仓，盈利 $940
           
净结果：虽然现货运费仍上升，但期货对冲回收 $940
实际运费损失：预期 $100万 → 实际 $80万（因为路线优化）
总体效果：通过保险机制，将不可控成本转化为可管理风险
```

### 关键教训
1. **快速决策**：地缘冲击需要 48 小时内做决策
2. **完美对冲不存在**：70% 保护已是良好结果
3. **交易成本**：$52,000 保险成本 vs $100万潜在风险 = 0.5% 保费（合理）
4. **仓位管理**：日监控非常重要，避免情绪化过度对冲

### 推广应用
类似地缘/供应链风险场景：
- 苏伊士运河堵塞（2021 长赐轮）
- 乌克兰冲突影响粮食、能源
- 台海局势影响芯片物流
- OPEC+ 减产冲击原油价格

**通用框架**：
1. 识别风险 → 2. 量化敞口 → 3. 选择工具 → 4. 快速执行 → 5. 持续监控 → 6. 灵活调整
            """,
            doc_type="case_study",
            commodity_type=CommodityType.SHIPPING,
            hedge_product_type=HedgeProductType.FUTURES,
            risk_types=[RiskType.PRICE, RiskType.GEOPOLITICAL, RiskType.OPERATIONAL],
            jurisdiction=Jurisdiction.SG,
            applicable_markets=["Singapore", "Shanghai", "Rotterdam"],
            effective_date=datetime(2024, 1, 15),
            expiry_date=None,
            confidentiality_level="internal",
            tags=["geopolitical_risk", "case_study", "supply_chain", "crisis_response"],
            source="2024 年度风险案例库",
            version="1.0",
            summary="红海危机中通过 BDI 期货对冲运费风险的实战案例"
        ))
        
        logger.info(f"核心知识库已初始化：{len(self.documents)} 份文档")
    
    def _add_document(self, doc: HedgeDocument):
        """添加文档到库"""
        self.documents[doc.doc_id] = doc
    
    def search(self, 
               query: str,
               commodity_type: Optional[CommodityType] = None,
               hedge_product_type: Optional[HedgeProductType] = None,
               risk_types: Optional[List[RiskType]] = None,
               jurisdiction: Optional[Jurisdiction] = None,
               doc_type: Optional[str] = None,
               top_k: int = 5) -> List[Dict]:
        """
        搜索对冲知识库
        
        Args:
            query: 搜索文本
            commodity_type: 商品类型筛选
            hedge_product_type: 对冲工具类型筛选
            risk_types: 风险类型列表（任意匹配）
            jurisdiction: 司法管辖区筛选
            doc_type: 文档类型筛选
            top_k: 返回数量
        
        Returns:
            包含匹配文档和相关度的列表
        """
        query_lower = query.lower()
        results = []
        
        for doc in self.documents.values():
            # 应用过滤条件
            if commodity_type and doc.commodity_type != commodity_type:
                continue
            if hedge_product_type and doc.hedge_product_type != hedge_product_type:
                continue
            if risk_types and not any(rt in doc.risk_types for rt in risk_types):
                continue
            if jurisdiction and doc.jurisdiction != jurisdiction and doc.jurisdiction != Jurisdiction.GLOBAL:
                continue
            if doc_type and doc.doc_type != doc_type:
                continue
            
            # 计算匹配度（简化的文本相似度）
            relevance = 0.0
            if query_lower in doc.title.lower():
                relevance += 3.0
            if query_lower in doc.summary.lower():
                relevance += 2.0
            if query_lower in doc.content.lower():
                relevance += 1.0
            
            # 标签匹配加分
            for tag in doc.tags:
                if query_lower in tag.lower() or tag.lower() in query_lower:
                    relevance += 0.5
            
            if relevance > 0:
                results.append({
                    "doc_id": doc.doc_id,
                    "title": doc.title,
                    "summary": doc.summary,
                    "content": doc.content[:500],  # 返回摘要
                    "doc_type": doc.doc_type,
                    "commodity_type": doc.commodity_type.value,
                    "hedge_product_type": doc.hedge_product_type.value,
                    "risk_types": [rt.value for rt in doc.risk_types],
                    "applicable_markets": doc.applicable_markets,
                    "jurisdiction": doc.jurisdiction.value,
                    "source": doc.source,
                    "version": doc.version,
                    "relevance_score": relevance,
                    "tags": doc.tags
                })
        
        # 按相关度排序
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:top_k]
    
    def get_strategy_by_scenario(self, scenario: str) -> List[Dict]:
        """
        根据场景获取对冲策略建议
        
        场景示例：
        - "iron_ore_import_hedge": 铁矿石进口对冲
        - "crude_oil_storage_protection": 原油库存保护
        - "shipping_cost_lock": 运费成本锁定
        - "geopolitical_risk_response": 地缘风险应急
        """
        scenario_mapping = {
            "iron_ore_import_hedge": {
                "commodity": CommodityType.IRON_ORE,
                "hedge_product": HedgeProductType.FUTURES,
                "risk": [RiskType.PRICE, RiskType.BASIS]
            },
            "crude_oil_storage_protection": {
                "commodity": CommodityType.CRUDE_OIL,
                "hedge_product": HedgeProductType.OPTIONS,
                "risk": [RiskType.PRICE]
            },
            "shipping_cost_lock": {
                "commodity": CommodityType.SHIPPING,
                "hedge_product": HedgeProductType.FUTURES,
                "risk": [RiskType.PRICE, RiskType.GEOPOLITICAL]
            },
            "geopolitical_risk_response": {
                "risk": [RiskType.GEOPOLITICAL]
            }
        }
        
        params = scenario_mapping.get(scenario, {})
        return self.search(
            query=scenario,
            commodity_type=params.get("commodity"),
            hedge_product_type=params.get("hedge_product"),
            risk_types=params.get("risk"),
            doc_type="strategy",
            top_k=3
        )


# 单例模式
_hedging_kb = None

def get_hedging_knowledge_base() -> HedgingExpertKnowledgeBase:
    """获取金融对冲专家库单例"""
    global _hedging_kb
    if _hedging_kb is None:
        _hedging_kb = HedgingExpertKnowledgeBase()
    return _hedging_kb
