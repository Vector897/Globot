# 🛡️ Globot Shield: Securing Global Lifelines (v2.2.20260201)

> **Google Gemini 3 Hackathon Entry - Powered by Gemini 3.0**

![Globot Dashboard](ai-sales-mvp/frontend/src/assets/dashboard_preview.png)

## 📖 Project Overview

**Globot** represents a paradigm shift in global trade risk management. Unlike traditional static dashboards, Globot is an **Agentic AI system** that proactively monitors, analyzes, and mitigates supply chain risks in real-time.

> 💡 *"We are not just optimizing spreadsheets; we are securing the lifelines of the global economy."*

### 🌍 Social Value (Potential Impact)

When Globot helps Maersk reroute quickly during the Red Sea crisis, it means:
- 🌾 **Food supplies in Kenya** remain uninterrupted
- 🔥 **Natural gas in Europe** lasts through the winter
- 🏥 **Emergency hospital equipment** doesn't get stuck at ports

This version (**v2.1.20260131**) is a specially built **"High-Fidelity Mock"** version, designed to ensure absolute stability and high impact during demonstrations. It simulates a realistic "4:55 PM Crisis Scenario" (geopolitical crisis in the Strait of Hormuz) and fully demonstrates the **AI Chain-of-Thought** and **Human-in-the-Loop** decision-making processes powered by **Gemini 3.0**.

## 🌟 Core Features (v2.1 Upgrade)

### 1. 🧠 Visualized AI Chain-of-Thought

- **Real-time Reasoning Display**: Shows the AI's thinking process line-by-line like a "typewriter," no longer a black box.
- **Multi-Agent Debate**: Features an "Adversarial Debate" (Red Team vs. Blue Team) to ensure decision robustness.
- **Citations & Provenance**: Every reasoning step is linked to specific documents in the RAG knowledge base or real-time news sources.

### 2. 🤖 Multi-Agent Collaboration Engine (5-Agent Reasoning Engine)

Features a team of 5 specialized AI Agents working in synergy:

- **🔭 Market Sentinel**: Monitors geopolitical signals from Reuters/Bloomberg (Mock API supports multiple scenarios: Red Sea crisis, port congestion, etc.).
- **🛡️ Financial Hedge Agent**: Real-time analysis of fuel prices, exchange rates, and freight risks. Provides intelligent hedging strategies (futures, options, forwards) for both normal and crisis risk management. Dynamically calculates fuel costs (+$180K) and freight fluctuations after rerouting.
- **🚢 Logistics Orchestrator**: Re-plans routes to avoid conflict zones.
- **📋 Compliance Manager**: Uses **Gemini 3.0's Extended Context Window** to analyze 500-page insurance policies and sanction lists.
- **⚖️ Adversarial Debate**: Red-teams decisions to prevent hallucinations.

### 3. 🛰️ Visual Risk Intelligence (Satellite Image Analysis) - NEW

Leverages **Gemini 3.0 Vision** multimodal capabilities:

- **Satellite Image Analysis**: Real-time detection of port congestion, canal blockages, and container accumulation.
- **Suez Canal Scenario**: Early warning for Ever Given-style events (6 hours before official announcements).
- **Visual Evidence**: Embeds satellite screenshots into decisions as reasoning evidence.

### 4. 📄 Long Document Compliance Analysis - NEW

Showcases Gemini's long context window advantages:

- **500-page Maritime Insurance Policies**: Automated parsing and route compliance verification.
- **OFAC/UN Sanction Lists**: Real-time checks (2M tokens context).
- **MLC 2006 Convention**: Automated verification of crew certifications.

### 5. �️ Aviation-Grade Logistics Holographic Map (Deck.gl)

- **Routes & Ports**: Visualizes major global shipping lanes and core ports like Shanghai, Rotterdam, and Los Angeles.
- **Interactive Vessels**: Click on yellow ship icons on the map to view detailed cargo manifests and voyage status.
- **Dynamic Risk**: When a crisis occurs, affected areas highlight and pulse with alerts.

### 6. 👨‍✈️ Human-in-the-Loop (HITL)

- **Decision Confirmation**: After the AI makes a recommendation, a human must click **"Approve & Execute"** for it to take effect, reflecting responsible AI principles.
- **Options**: Provides "Details" and "Override" (manual intervention) options.

### 7. 🔒 Enterprise-Grade Authentication & Security

- **Multi-channel Login**: Integrated with Clerk, supporting Google, Facebook, LinkedIn social logins, and Email/SMS verification.
- **Admin Console**: A visual dashboard designed specifically for administrators to monitor global system KPIs.
- **Security Whitelist**: Email whitelist system based on environment variables to ensure privacy and security of administrative permissions.

### 🔌 Pluggable Data Sources

The **Reasoning Engine** in this project is generic. Current use of Mock data is a Hackathon constraint. Production environments can directly integrate:

| Data Source | Purpose | Replacement Method |
| :--- | :--- | :--- |
| Bloomberg Terminal API | Real-time market data, geopolitical events | Replace `mock_knowledge_base.py` |
| MarineTraffic API | Real-time AIS vessel tracking | Replace `demo/cot_data.py` |
| Sentinel-2 Satellite API | Port/Canal satellite imagery | Replace `visual_risk_service.py` |
| Reuters/Bing News API | Real-time news feeds | Replace Market Sentinel data source |

## 🎯 Target Customers

| Industry | Example Companies | User Roles |
| :--- | :--- | :--- |
| Shipping & Logistics | Maersk, COSCO | NOC Manager, Control Tower Lead |
| High-end Manufacturing | Tesla, Apple | Global Supply Manager, Resiliency PM |
| Commodity Trading | Cargill, Glencore | Commodity Logistics Risk Lead |
| Freight Forwarding | Flexport | Trade Compliance Officer |

## 🚀 Quick Start

### 1. Start Backend

#### Prerequisites
- Python 3.11

#### Installation Steps

```bash
# Enter backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
 venv\Scripts\activate.bat
# macOS/Linux:
 source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create a .env file in the backend directory with core configurations:
# CLERK_ISSUER_URL=...
# ADMIN_WHITELIST=...

# Start server
python start_server.py
```
_Backend runs at `http://localhost:8000`_

### 2. Start Frontend

```bash
cd frontend
npm install

# Configure environment variables
# Create a .env file in the frontend directory:
# VITE_CLERK_PUBLISHABLE_KEY=...
# VITE_ADMIN_WHITELIST=...

npm run dev
```
_Frontend runs at `http://localhost:5173`_

### 3. Demo Path

1. Open browser and visit: `http://localhost:5173/pay`
2. Click **"Watch Demo"** to go to the route selection page (`/port`).
3. Confirm route (default Shanghai -> Rotterdam) and click **"Start Simulation"** to enter the demo (`/demo`).
4. Observe the AI reasoning process and click confirm once the "Approve & Execute" button appears.

## 📂 Key File Descriptions

- `updates/README.md`: Detailed demo operation steps (Must-read for new users).
- `task.md`: Project development task list.
- `updates/README.md`: Service startup and troubleshooting quick-reference table.

## 💰 Financial Hedging System (NEW)

Globot now includes a comprehensive financial risk hedging system for managing:

### Risk Categories
- **Fuel Price Risk**: Hedge marine fuel price fluctuations using futures, options, and swaps.
- **Currency Risk**: Lock in exchange rates via forward contracts and currency swaps.
- **Freight Rate Risk**: Combined strategy of long-term charter contracts and spot market participation.

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

**Maintainer**: Vector897
**License**: MIT
