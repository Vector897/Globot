# 🤖 Telegram Bot + Ollama AI 使用指南

## ✅ 已完成配置

- **Telegram Bot**: @RoSP_Hackthon2026_bot
- **AI 模型**: Ollama qwen2.5:latest (7.6B)
- **运行模式**: 轮询模式（无需 Webhook/ngrok）
- **Bot 脚本**: `telegram_bot_with_ollama.py`

---

## 🚀 快速开始

### 1. 启动 Bot

**双击运行**: `start_ai_bot.bat`

或手动运行：
```bash
cd D:\RoSP_Hackthon2026
python telegram_bot_with_ollama.py
```

### 2. 测试 Bot

访问: **https://t.me/RoSP_Hackthon2026_bot**

发送消息：
- `DJI M30T 有哪些特点？`
- `续航时间是多少？`
- `推荐一款适合新手的无人机`

### 3. 等待响应

- ⏱️ **首次响应**: 30-40秒（Ollama 加载模型）
- ⏱️ **后续响应**: 2-5秒（模型已缓存）

---

## 📋 配置要求

### 必需组件

1. **Python 3.8+**
2. **Ollama** 
   - 安装位置: `D:\Ollama\ollama.exe`
   - 模型存储: `D:\ollama_models\`
   - 已安装模型: qwen2.5:latest

3. **环境变量**
   - `TELEGRAM_BOT_TOKEN`: 已配置在 `backend/.env`

### Python 依赖

```bash
pip install requests python-dotenv
```

---

## 🎯 工作原理

```
用户 (Telegram)
    ↓ 发送消息
Bot 轮询获取
    ↓ 每30秒检查一次
构建 AI 提示词
    ↓ 包含角色和上下文
Ollama API
    ↓ qwen2.5:latest 生成
AI 回复
    ↓ 发送回 Telegram
用户收到回复 ✅
```

---

## 💬 功能特性

### ✅ AI 智能回答
- 使用 qwen2.5 模型（7.6B 参数）
- 实时生成专业回答
- 针对 DJI 产品优化

### ✅ 命令支持
- `/start` - 欢迎消息
- `/help` - 使用帮助
- `/status` - 服务状态

### ✅ 用户体验
- "正在输入"状态显示
- 消息引用回复
- 实时日志输出

---

## 🛠️ 管理命令

### 启动
```bash
start_ai_bot.bat
```

### 停止
```bash
taskkill /F /IM python.exe
```

### 重启
```bash
taskkill /F /IM python.exe
python telegram_bot_with_ollama.py
```

### 查看日志
Bot 在独立窗口运行，可查看实时日志

---

## 📊 Ollama 管理

### 查看已安装模型
```bash
D:\Ollama\ollama.exe list
```

### 测试模型
```bash
D:\Ollama\ollama.exe run qwen2.5:latest "你好"
```

### 下载其他模型
```bash
D:\Ollama\ollama.exe pull llama3
```

---

## 🐛 故障排除

### 问题 1: Bot 不回复

**检查项**:
1. Bot 窗口是否运行？
2. Ollama 服务是否运行？
3. 是否有多个 Bot 实例？

**解决**:
```bash
# 重启 Bot
start_ai_bot.bat
```

### 问题 2: 响应太慢

**正常情况**:
- 首次: 30-40秒（加载模型）
- 后续: 2-5秒

**如果持续慢**:
- 检查 CPU/内存
- 考虑使用更小的模型

### 问题 3: Ollama 错误

**检查 Ollama 服务**:
```bash
curl http://localhost:11434/api/tags
```

**重启 Ollama**:
```bash
# 关闭所有 Ollama 进程
taskkill /F /IM ollama.exe

# 重新启动
D:\Ollama\ollama.exe serve
```

---

## 🎓 技术细节

### 文件结构
```
D:\RoSP_Hackthon2026\
├── telegram_bot_with_ollama.py  # AI Bot 主程序
├── start_ai_bot.bat             # 启动脚本
├── backend/.env                 # 配置文件（含 Token）
└── README_TELEGRAM_BOT.md       # 本文档
```

### 核心配置

**telegram_bot_with_ollama.py**:
- `BOT_TOKEN`: Telegram Bot Token
- `OLLAMA_URL`: http://localhost:11434/api/generate
- `OLLAMA_MODEL`: qwen2.5:latest

### AI 提示词模板

```python
prompt = f"""你是 DJI 无人机的专业销售顾问。

客户问题：{text}

请用专业、友好的语气回答，重点突出产品特性和优势。
回答要简洁（100字以内）。
"""
```

---

## 📖 相关文档

- **架构图.md** - 系统架构
- **时序图.md** - 交互流程
- **backend/README.md** - 后端文档

---

## ⚠️ 重要提示

### 安全
- ✅ `backend/.env` 已在 `.gitignore` 中
- ❌ 不要将 Token 提交到公开仓库
- ✅ 定期更换 Token

### 性能
- 首次响应慢是正常的（模型加载）
- 后续响应会很快（模型缓存）
- 建议 16GB+ 内存运行 qwen2.5

### 限制
- 当前为轮询模式（每30秒检查一次）
- 没有客户管理和对话历史
- 如需完整功能，可升级到 Webhook + 后端模式

---

## 🚀 下一步

### 升级到完整后端

如需以下功能：
- 客户管理
- 对话历史
- 知识库检索（RAG）
- 转人工功能

可以配置使用 FastAPI 后端 + Webhook 模式。

参考: `backend/README.md`

---

**Bot 链接**: https://t.me/RoSP_Hackthon2026_bot

**快速启动**: 双击 `start_ai_bot.bat`


