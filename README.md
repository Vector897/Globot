# 🛡️ Globot Shield: Securing Global Lifelines (v2.2.20260201)

> **Google Gemini 3 Hackathon 参赛作品 - Powered by Gemini 2.0**

![Globot Dashboard](ai-sales-mvp/frontend/src/assets/dashboard_preview.png)

## 📖 项目概览

**Globot** 代表了全球贸易风险管理的范式转变。与传统的静态仪表盘不同，Globot 是一个 **Agentic AI (代理智能) 系统**，能够实时主动监控、分析并缓解供应链风险。

> 💡 *"We are not just optimizing spreadsheets; we are securing the lifelines of the global economy."*
> 
> — 我们不仅仅是在优化表格，我们是在守护全球经济的生命线。

### 🌍 社会价值 (Potential Impact)

当 Globot 帮助 Maersk 在红海危机中快速改道时，这意味着：
- 🌾 **肯尼亚的粮食**不会断供
- 🔥 **欧洲的天然气**能够过冬
- 🏥 **医院的急救设备**不会卡在港口

此版本 (**v2.1.20260131**) 是专门构建的 **"High-Fidelity Mock (高保真模拟)"** 版本，旨在确保演示过程的绝对稳定和高冲击力。它模拟了一个逼真的 "下午 4:55 危机场景"（霍尔木兹海峡地缘危机），并完整展示了 **AI 思维链 (Chain-of-Thought)** 和 **人机共驾 (Human-in-the-Loop)** 决策过程。

## 🌟 核心功能 (v2.1 升级版)

### 1. 🧠 可视化 AI 思维链 (Chain-of-Thought)

- **实时推理展示**: 像 "打字机" 一样逐行展示 AI 的思考过程，不再是黑盒。
- **多 Agent 辩论**: 展示 "红队 vs 蓝队" 的对抗性辩论 (Adversarial Debate)，确保决策鲁棒性。
- **引用溯源**: 每个推理步骤都关联到具体的 RAG 知识库文档或实时新闻源。

### 2. 🤖 多 Agent 协作引擎 (5-Agent Reasoning Engine)

展示了由 5 个专业 AI Agent 组成的团队协同工作：

- **🔭 市场哨兵 (Market Sentinel)**: 监控路透社/彭博社的地缘政治信号 (Mock API 支持多场景：红海危机、港口拥堵等)。
- **🛡️ 风险对冲专家 (Risk Hedger)**: 计算财务风险敞口，**动态计算改道后的燃油成本 (+$180K) 和运费波动**。
- **🚢 物流指挥官 (Logistics Orchestrator)**: 重新规划航线以避开冲突区域。
- **📋 合规经理 (Compliance Manager)**: 使用 **Gemini 2M Token Context Window** 分析 500 页保险条款和制裁名单。
- **⚖️ 对抗性辩论 (Adversarial Debate)**: 对决策进行红队测试，防止幻觉。

### 3. �️ Visual Risk Intelligence (卫星图像分析) - NEW

利用 **Gemini Vision** 多模态能力：

- **卫星图像分析**: 实时检测港口拥堵、运河堵塞、集装箱堆积。
- **苏伊士运河场景**: Ever Given 类型事件的早期预警 (官方公告前 6 小时)。
- **视觉证据**: 在决策中嵌入卫星截图作为推理依据。

### 4. 📄 Long Document Compliance (长文档合规分析) - NEW

展示 Gemini 长上下文窗口优势：

- **500 页海事保险条款**自动解析与航线合规校验。
- **OFAC/UN 制裁名单**实时核查 (2M tokens context)。
- **MLC 2006 公约**自动验证船员资质。

### 5. �🛫 航空级物流全息地图 (Deck.gl)

- **线路与港口**: 可视化全球主要航线及上海、鹿特丹、洛杉矶等核心港口。
- **交互式船舶**: 点击地图上的黄色船舶图标，可查看详细货物清单和航行状态。
- **动态风险**: 危机发生时，受影响区域会高亮并发出脉冲警报。

### 6. 👨‍✈️ 人机共驾 (Human-in-the-Loop)

- **决策确认**: AI 提出建议后，必须由人类点击 **"Approve & Execute"** 才能执行，体现负责任的 AI 原则。
- **多种选择**: 提供 "Details" (查看详情) 和 "Override" (人工干预) 选项。

### 7. 🔒 企业级身份验证与安全

- **多渠道登录**: 集成 Clerk，支持 Google, Facebook, LinkedIn 社交登录及邮箱/短信验证码。
- **管理员控制台**: 专为管理员设计的可视化看板，监控系统全局 KPI。
- **安全白名单**: 基于环境变量的邮箱白名单系统，确保管理权限的隐私与安全。

### 🔌 可插拔架构 (Pluggable Data Sources)

本项目的 **Reasoning Engine (推理引擎)** 是通用的，当前使用 Mock 数据是 Hackathon 限制。生产环境可直接对接：

| 数据源 | 用途 | 替换方式 |
| :--- | :--- | :--- |
| Bloomberg Terminal API | 实时市场行情、地缘政治事件 | 替换 `mock_knowledge_base.py` |
| MarineTraffic API | 船舶 AIS 实时定位 | 替换 `demo/cot_data.py` |
| Sentinel-2 Satellite API | 港口/运河卫星图像 | 替换 `visual_risk_service.py` |
| Reuters/Bing News API | 实时新闻流 | 替换 Market Sentinel 数据源 |

## 🎯 目标客户 (Target Customers)

| 行业 | 企业示例 | 用户角色 |
| :--- | :--- | :--- |
| 海运与物流 | Maersk, COSCO | NOC Manager, Control Tower Lead |
| 高端制造业 | Tesla, Apple | Global Supply Manager, Resiliency PM |
| 大宗商品交易 | Cargill, Glencore | Commodity Logistics Risk Lead |
| 货运代理 | Flexport | Trade Compliance Officer |

## 🚀 快速开始

### 1. 启动后端

#### 前置要求
- Python 3.11

#### 安装步骤

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
 venv\Scripts\activate.bat
# macOS/Linux:
 source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
# 在 backend 目录下创建 .env 文件，参考核心配置：
# CLERK_ISSUER_URL=...
# ADMIN_WHITELIST=...

# 启动服务器
python start_server.py
```
_后端运行在 `http://localhost:8000`_

### 2. 启动前端

```bash
cd frontend
npm install

# 配置环境变量
# 在 frontend 目录下创建 .env 文件：
# VITE_CLERK_PUBLISHABLE_KEY=...
# VITE_ADMIN_WHITELIST=...

npm run dev
```
_前端运行在 `http://localhost:5173`_

### 3. 演示路径

1. 打开浏览器访问: `http://localhost:5173/pay`
2. 点击 **"Watch Demo"**，跳转至航线选择页 (`/port`)。
3. 确认路线（默认 Shanghai -> Rotterdam），点击 **"Start Simulation"** 进入演示 (`/demo`)。
4. 观察 AI 推理过程，待 "Approve & Execute" 按钮出现后点击确认。

## 📂 关键文件说明

- `updates/README.md`: 详细的演示操作步骤说明（新用户必读）。
- `task.md`: 项目开发任务清单。
- `updates/README.md`: 服务启动与故障排查速查表。

---

**维护者**: Vector897
**许可证**: MIT
