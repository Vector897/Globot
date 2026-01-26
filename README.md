# 🛡️ Globot: 全球贸易的 AI 守护盾 (v2.1.20260112)

> **Imagine Cup 2026 参赛作品 - "High-Fidelity Demo (高保真演示)" 版本**

![Globot Dashboard](ai-sales-mvp/frontend/src/assets/dashboard_preview.png)

## 📖 项目概览

**Globot** 代表了全球贸易风险管理的范式转变。与传统的静态仪表盘不同，Globot 是一个 **Agentic AI (代理智能) 系统**，能够实时主动监控、分析并缓解供应链风险。

此版本 (**v2.1.20260112**) 是专门构建的 **"High-Fidelity Mock (高保真模拟)"** 版本，旨在确保演示过程的绝对稳定和高冲击力。它模拟了一个逼真的 "下午 4:55 危机场景"（霍尔木兹海峡地缘危机），并完整展示了 **AI 思维链 (Chain-of-Thought)** 和 **人机共驾 (Human-in-the-Loop)** 决策过程。

## 🌟 核心功能 (v2.1 升级版)

### 1. 🧠 可视化 AI 思维链 (Chain-of-Thought)

- **实时推理展示**: 像 "打字机" 一样逐行展示 AI 的思考过程，不再是黑盒。
- **多 Agent 辩论**: 展示 "红队 vs 蓝队" 的对抗性辩论 (Adversarial Debate)，确保决策鲁棒性。
- **引用溯源**: 每个推理步骤都关联到具体的 RAG 知识库文档或实时新闻源。

### 2. 🤖 多 Agent 协作引擎

展示了由 5 个专业 AI Agent 组成的团队协同工作：

- **🔭 市场哨兵 (Market Sentinel)**: 监控路透社/彭博社的地缘政治信号 (Mock API 支持多场景：红海危机、港口拥堵等)。
- **🛡️ 风险对冲专家 (Financial Hedge Agent)**: 实时分析燃料价格、汇率、运价风险，提供智能对冲策略（期货、期权、远期合约），支持正常与危机时刻的多维度风险管理。
- **🚢 物流指挥官 (Logistics Orchestrator)**: 重新规划航线以避开冲突区域。
- **📋 合规经理 (Compliance Manager)**: 核查 OFAC/UN 制裁名单。
- **⚖️ 对抗性辩论 (Adversarial Debate)**: 对决策进行红队测试，防止幻觉。

### 3. 🛫 航空级物流全息地图 (Deck.gl)

- **线路与港口**: 可视化全球主要航线及上海、鹿特丹、洛杉矶等核心港口。
- **交互式船舶**: 点击地图上的黄色船舶图标，可查看详细货物清单和航行状态。
- **动态风险**: 危机发生时，受影响区域会高亮并发出脉冲警报。

### 4. 👨‍✈️ 人机共驾 (Human-in-the-Loop)

- **决策确认**: AI 提出建议后，必须由人类点击 **"Approve & Execute"** 才能执行，体现负责任的 AI 原则。
- **多种选择**: 提供 "Details" (查看详情) 和 "Override" (人工干预) 选项。

### 5. 🔒 企业级身份验证与安全 (New)

- **多渠道登录**: 集成 Clerk，支持 Google, Facebook, LinkedIn 社交登录及邮箱/短信验证码。
- **管理员控制台**: 专为管理员设计的可视化看板，监控系统全局 KPI。
- **安全白名单**: 基于环境变量的邮箱白名单系统，确保管理权限的隐私与安全。

## 🏗️ 技术架构 (演示专用版)

```mermaid
graph TD
    Client["前端 (React + Vite)"]
    MockServer["后端 (FastAPI + High-Fidelity Mock)"]

    subgraph "前端层 (UI/UX)"
        Map["3D/2D 地球 (Deck.gl)"]
        CoT["思维链面板 (WebSocket)"]
        Nav["航线选择器 (/port)"]
    end

    subgraph "后端逻辑 (Python)"
        WS["WebSocket 事件流"]
        Sentinel["市场哨兵 Mock 服务"]
        Controller["自动播放控制器"]
    end

    Client <-->| "CoT Events / Actions" | WS
    WS <--> Controller
    Controller -->| "调用" | Sentinel
    Auth["Clerk Auth Service"] --- Client
    Auth --- MockServer
```

- **前端**: React, TypeScript, Tailwind CSS, Deck.gl, Framer Motion.
- **后端**: Python FastAPI, WebSocket (实现双向实时通信).
- **主要流程**: `/pay` (营销页) -> `/port` (航线选择) -> `/demo` (核心模拟).

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

## 💰 Financial Hedging System (NEW)

Globot now includes a comprehensive financial risk hedging system for managing:

### Risk Categories
- **燃料价格风险 (Fuel Price Risk)**: 使用期货、期权、掉期对冲船用燃料价格波动
- **汇率风险 (Currency Risk)**: 通过远期合约、货币掉期锁定汇率
- **运价波动 (Freight Rate Risk)**: 长期租船合同与现货市场组合策略

### Features
- ✅ AI-powered risk assessment with Value at Risk (VaR) calculations
- ✅ Automated hedging strategy recommendations (normal & crisis modes)
- ✅ Real-time market data simulation
- ✅ Crisis detection and emergency hedging protocols
- ✅ Multi-instrument portfolio optimization

### API Endpoints
```bash
# Health check
GET http://localhost:8000/api/hedge/health

# Get market data
GET http://localhost:8000/api/hedge/market-data

# Assess risk exposure
POST http://localhost:8000/api/hedge/assess-risk

# Get hedging recommendations
POST http://localhost:8000/api/hedge/recommend

# Activate crisis hedging
POST http://localhost:8000/api/hedge/crisis-activate

# Generate executive report
POST http://localhost:8000/api/hedge/report
```

### Documentation
- **API Documentation**: `backend/docs/HEDGING_API.md`
- **Strategy Guide**: `backend/docs/HEDGING_STRATEGY_GUIDE.md`
- **Claude Skill**: `backend/claude_skill/financial_hedging/SKILL.md`

### Quick Test
```bash
cd backend
python test_hedging_system.py
```

---

**维护者**: Vector897
**许可证**: MIT
