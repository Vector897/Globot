# 🛡️ Globot: 全球贸易的 AI 守护盾 (v2.0.20251229)

> **Imagine Cup 2026 参赛作品 - "演示专用 (Mock-Ready)" 版本**

![Globot Dashboard](ai-sales-mvp/frontend/src/assets/dashboard_preview.png)

## 📖 项目概览

**Globot** 代表了全球贸易风险管理的范式转变。与传统的静态仪表盘不同，Globot 是一个 **Agentic AI (代理智能) 系统**，能够实时主动监控、分析并缓解供应链风险。

此版本 (**v2.0.20251229**) 是专门构建的 **"演示优先 (Mock-First)"** 版本，旨在确保演示过程的绝对稳定和高冲击力，不依赖可能不稳定的外部 API。它模拟了一个逼真的 "下午 4:55 危机场景"，涉及霍尔木兹海峡的船只扣押事件。

## 🌟 核心功能 (v2.0 视觉升级版)

### 1. 🛫 航空级物流全息地图 (Deck.gl)

- **全息可视化**: 采用半透明、多维度的投影风格，配合 "航空海图" 美学 (蓝白技术网格)。
- **实时追踪**: 可视化 50+ 条背景物流航线和高保真港口节点 (上海、鹿特丹、洛杉矶等)。
- **危机指示**: 瞬间高亮显示 "风险中 (At-Risk)" 的船只，使用 **脉冲红色信标** 取代通用的静态连线。

### 2. 🤖 多 Agent 协作引擎

展示了由 5 个专业 AI Agent 组成的团队协同工作：

- **🔭 市场哨兵 (Market Sentinel)**: 监控路透社/彭博社的地缘政治信号。
- **🛡️ 风险对冲专家 (Risk Hedger)**: 计算财务风险敞口并触发保险买入。
- **🚢 物流指挥官 (Logistics Orchestrator)**: 重新规划航线以避开冲突区域。
- **📋 合规经理 (Compliance Manager)**: 核查 OFAC/UN 制裁名单。
- **⚖️ 对抗性辩论 (Adversarial Debate)**: 对决策进行红队测试，防止幻觉。

_特性_: 每个 Agent 都配备 **动态 "呼吸灯" 状态** (蓝=工作中, 绿=完成, 红=警报)，并与危机时间轴完全同步。

### 3. ☁️ "Azure 驱动 (Powered by Azure)" 集成

- 展示 **Azure OpenAI (GPT-4o)** 的推理能力。
- **Azure AI Search** 用于 RAG (检索增强生成)。
- **Azure Cognitive Services** 用于实时信号处理。

## 🏗️ 技术架构 (演示专用版)

此版本采用 **解耦 Mock 架构** 以确保 100% 的演示可靠性。

```mermaid
graph TD
    Client[前端 (React + Vite)]
    MockServer[后端 (FastAPI + Mock Data)]

    subgraph "前端层"
        Map[3D 地球 (Deck.gl)]
        Stream[风险监控器 (Ant Design Charts)]
        Agents[Agent 工作流 (Framer Motion)]
    end

    subgraph "后端模拟"
        WS[WebSocket 管理器]
        Gen[场景生成器]
        Time[时间轴控制器]
    end

    Client <-->|WebSocket 实时事件| WS
    WS <--> Gen
    Gen -->|注入| Time
```

- **前端**: React, TypeScript, Deck.gl, Ant Design, Framer Motion.
- **后端**: Python FastAPI (提供预计算的场景 JSON).
- **数据**: 模拟 60 秒危机循环的静态 Mock 数据.

## 🚀 快速开始 (运行指南)

### 前置要求

- Node.js (v18+)
- Python (3.9+)

### 1. 启动前端

```bash
cd ai-sales-mvp/frontend
npm install
npm run dev
```

> 以此访问: `http://localhost:5175/demo`

### 2. 启动后端 (可选，用于 UI 展示)

_注意: 当前 v2.0 前端可在后端离线时以 "仅 UI 模式" 运行，但为了完整的 WebSocket 体验建议启动后端:_

```bash
cd ai-sales-mvp/backend
pip install -r requirements.txt
python main.py
```

## 📂 项目结构

```
RoSP/
├── ai-sales-mvp/
│   ├── frontend/          # React 应用程序
│   │   ├── src/components # Globe3D, AgentWorkflow 等组件
│   │   └── src/pages      # DemoPage (主控制器)
│   └── backend/           # FastAPI 服务器
├── docs/                  # 技术白皮书 & 演示文稿
└── submitted_materials/   # 最终 Imagine Cup 交付材料
```

## 📝 更新日志 (v2.0.20251229)

- **新增**: 带有时间轴叙事的系统事件日志。
- **优化**: 移除日志中的表情符号，提升专业度。
- **升级**: 3D 地球现包含国界线和港口标签。
- **修复**: Globe3D 组件的编译问题。

---

**维护者**: Vector897
**许可证**: MIT
