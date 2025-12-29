# Telegram Bot 集成指南

本文档说明如何将 Telegram Bot 集成到 DJI 销售 AI 助理系统中。

## 📋 前置条件

1. 一个 Telegram 账号
2. 能够访问公网的服务器（用于接收 Webhook）
3. HTTPS 域名（Telegram 要求 Webhook 使用 HTTPS）

---

## 🤖 步骤 1：创建 Telegram Bot

### 1.1 与 @BotFather 对话

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按提示设置 Bot 名称和用户名

**示例对话**：
```
You: /newbot

BotFather: Alright, a new bot. How are we going to call it? 
Please choose a name for your bot.

You: DJI Sales AI Assistant

BotFather: Good. Now let's choose a username for your bot. 
It must end in `bot`. Like this, for example: TetrisBot or tetris_bot.

You: DJISalesBot

BotFather: Done! Congratulations on your new bot. 
You will find it at t.me/DJISalesBot. 
You can now add a description, about section and profile picture for your bot.

Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890

Keep your token secure and store it safely, it can be used by anyone to control your bot.
```

### 1.2 保存 Bot Token

**重要**：妥善保管你的 Bot Token，不要泄露！

复制 Token（格式类似：`1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890`）

---

## ⚙️ 步骤 2：配置后端

### 2.1 更新 `.env` 文件

在项目根目录创建或编辑 `.env` 文件：

```bash
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/dji_sales_mvp

# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:latest

# ===== Telegram Bot 配置 =====
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/telegram

# 注意：TELEGRAM_WEBHOOK_URL 必须是你的服务器公网地址 + /webhook/telegram
# 例如：https://api.example.com/webhook/telegram
```

### 2.2 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2.3 启动后端服务

```bash
# 本地开发
python main.py

# 或使用 uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🌐 步骤 3：配置 Webhook

### 方案 A：使用 ngrok（本地开发推荐）

#### 3.1 安装 ngrok

下载：https://ngrok.com/download

#### 3.2 启动 ngrok

```bash
ngrok http 8000
```

你会看到类似这样的输出：
```
Forwarding  https://abcd-123-456-789.ngrok.io -> http://localhost:8000
```

#### 3.3 设置 Webhook

复制 ngrok 提供的 HTTPS URL，然后访问：

```bash
# 方法 1：使用浏览器访问
https://abcd-123-456-789.ngrok.io/api/telegram/set-webhook?webhook_url=https://abcd-123-456-789.ngrok.io/webhook/telegram

# 方法 2：使用 curl
curl -X POST "https://abcd-123-456-789.ngrok.io/api/telegram/set-webhook" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://abcd-123-456-789.ngrok.io/webhook/telegram"}'
```

### 方案 B：使用生产服务器

#### 3.1 部署到服务器

将代码部署到你的服务器（如 AWS、Azure、DigitalOcean 等）

#### 3.2 配置 HTTPS

使用 Let's Encrypt 或云服务提供商的 SSL 证书

#### 3.3 设置 Webhook

```bash
curl -X POST "https://your-domain.com/api/telegram/set-webhook" \
  -H "Content-Type: application/json"
```

---

## ✅ 步骤 4：测试 Bot

### 4.1 验证 Webhook 状态

```bash
# 方法 1：API 查询
curl https://your-domain.com/api/telegram/webhook-info

# 方法 2：直接查询 Telegram API
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

**成功响应示例**：
```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.com/webhook/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

### 4.2 与 Bot 对话

1. 在 Telegram 中搜索你的 Bot（例如：`@DJISalesBot`）
2. 点击 "Start" 或发送 `/start`
3. 发送测试消息，例如：
   - "M30T 的续航时间是多少？"
   - "Dock 3 有什么特点？"
   - "我想购买无人机，有什么推荐？"

### 4.3 验证功能

- ✅ Bot 能够回复消息
- ✅ 回复内容专业且相关
- ✅ 低置信度时提示转人工
- ✅ 多轮对话能够记住上下文

---

## 🎛️ 管理命令

### 查看 Bot 信息

```bash
curl https://your-domain.com/api/telegram/bot-info
```

### 删除 Webhook

```bash
curl -X DELETE https://your-domain.com/api/telegram/webhook
```

### 重新设置 Webhook

```bash
curl -X POST "https://your-domain.com/api/telegram/set-webhook" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "https://new-domain.com/webhook/telegram"}'
```

---

## 🐛 常见问题

### Q1: Webhook 设置失败

**可能原因**：
- URL 不是 HTTPS
- 服务器无法访问
- Bot Token 错误

**解决方法**：
```bash
# 1. 检查 Token 是否正确
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

# 2. 确保服务器可访问
curl https://your-domain.com/

# 3. 检查 Webhook URL
curl https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

### Q2: Bot 不回复消息

**检查步骤**：
1. 查看后端日志：`tail -f backend.log`
2. 验证数据库连接
3. 确认 chatbot 模块已初始化
4. 检查 Webhook 是否接收到更新

**调试命令**：
```bash
# 查看最近的日志
docker logs -f dji_sales_backend

# 或者
journalctl -u dji-sales-backend -f
```

### Q3: 消息重复处理

**原因**：Webhook 重试机制

**解决**：确保 Webhook 端点返回 200 状态码

### Q4: ngrok 断开连接

**解决**：
- 免费版 ngrok 会话 2 小时后过期
- 重启 ngrok 后需要重新设置 Webhook
- 建议：生产环境使用固定域名

---

## 📊 监控和日志

### 查看实时日志

```bash
# 后端日志
tail -f backend/logs/app.log

# Telegram 交互日志
grep "Telegram" backend/logs/app.log
```

### 监控指标

```python
# 在后端添加监控
@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    return {
        "total_conversations": db.query(Conversation).count(),
        "active_conversations": db.query(Conversation).filter(
            Conversation.status == "active"
        ).count(),
        "total_messages": db.query(Message).count(),
        "telegram_users": db.query(Customer).filter(
            Customer.email.like("telegram_%")
        ).count()
    }
```

---

## 🚀 生产环境部署建议

### 1. 使用环境变量

不要在代码中硬编码 Token

```python
# ❌ 不要这样
token = "1234567890:ABCdef..."

# ✅ 应该这样
from config import get_settings
settings = get_settings()
token = settings.telegram_bot_token
```

### 2. 配置反向代理（Nginx）

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location /webhook/telegram {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 使用 Supervisor 管理进程

```ini
[program:dji-sales-backend]
command=/path/to/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
directory=/path/to/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/dji-sales-backend.err.log
stdout_logfile=/var/log/dji-sales-backend.out.log
```

### 4. 配置速率限制

防止 API 滥用：

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/webhook/telegram")
@limiter.limit("100/minute")
async def telegram_webhook(request: Request, ...):
    ...
```

---

## 📚 相关资源

- [Telegram Bot API 文档](https://core.telegram.org/bots/api)
- [BotFather 命令列表](https://core.telegram.org/bots#botfather)
- [Webhook 指南](https://core.telegram.org/bots/webhooks)
- [ngrok 文档](https://ngrok.com/docs)

---

## 🎯 下一步

集成完成后，你可以：

1. ✅ 自定义 Bot 欢迎消息和命令
2. ✅ 添加富文本格式（Markdown/HTML）
3. ✅ 集成内联键盘（用户可点击按钮）
4. ✅ 添加图片和文件发送功能
5. ✅ 实现多语言支持
6. ✅ 集成 Azure AI 服务（Imagine Cup 要求）

祝你使用愉快！🚀

