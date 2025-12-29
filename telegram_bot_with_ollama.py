"""
Telegram Bot - 轮询模式 + Ollama AI
真实 AI 响应，无需 Webhook
"""
import sys
import time
import requests
import os
from datetime import datetime

# 设置编码
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# 配置
BOT_TOKEN = "8255985659:AAH8TAhWi3-F36W5mUHG6bZZ650OT6wNLSM"
BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:latest"

print("="*60)
print("  Telegram Bot - AI 模式启动")
print("="*60)
print()

# 获取 Bot 信息
print("1. 连接 Telegram...")
try:
    response = requests.get(f"{BASE_URL}/getMe", timeout=10)
    bot_info = response.json().get("result", {})
    print(f"   ✅ Bot: @{bot_info.get('username')}")
    print(f"   链接: https://t.me/{bot_info.get('username')}")
except Exception as e:
    print(f"   ❌ 连接失败: {e}")
    sys.exit(1)

print()
print("2. 测试 Ollama...")
try:
    response = requests.get("http://localhost:11434/api/tags", timeout=5)
    models = response.json().get("models", [])
    print(f"   ✅ Ollama: {len(models)} 个模型")
    for model in models:
        print(f"      - {model['name']}")
except Exception as e:
    print(f"   ❌ Ollama 失败: {e}")
    sys.exit(1)

print()
print("3. 清除旧的 Webhook...")
try:
    requests.post(f"{BASE_URL}/deleteWebhook", timeout=10)
    print("   ✅ 已清除")
except:
    pass

print()
print("="*60)
print("  🤖 Bot 运行中 - AI 模式")
print("="*60)
print()
print("💬 在 Telegram 中测试:")
print(f"   https://t.me/{bot_info.get('username')}")
print()
print("📝 发送消息测试 AI 响应")
print("⏹️  按 Ctrl+C 停止")
print()
print("-"*60)
print()

last_update_id = None
message_count = 0

def call_ollama(prompt):
    """调用 Ollama 生成 AI 响应"""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get("response", "抱歉，我暂时无法回答。")
        else:
            return "AI 服务暂时不可用，请稍后再试。"
    except Exception as e:
        print(f"   ⚠️  Ollama 调用失败: {e}")
        return "抱歉，AI 服务出现问题，请稍后再试。"

def handle_command(command, user_name):
    """处理命令"""
    if command.startswith("/start"):
        return f"""你好 {user_name}！欢迎使用 DJI 智能销售助理！

🤖 AI 模式（Ollama + qwen2.5）

我可以帮您：
✅ 了解 DJI 无人机产品
✅ 解答技术问题
✅ 提供购买建议

💡 直接发送您的问题，我会用 AI 回答！

Powered by Ollama qwen2.5:latest"""
    
    elif command.startswith("/help"):
        return """使用帮助

**AI 模式说明：**
当前使用 Ollama AI 模型实时生成回答。

**使用方法：**
直接发送您的问题，例如：
• DJI M30T 的参数是什么？
• 续航时间多久？
• 推荐哪款无人机？

**命令列表：**
/start - 开始使用
/help - 查看帮助
/status - 查看服务状态

✅ AI 服务正常运行！"""
    
    elif command.startswith("/status"):
        return f"""服务状态

✅ Bot：运行中
✅ 模式：轮询 + AI（Ollama）
✅ 模型：{OLLAMA_MODEL}
⏰ 时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
📨 处理消息数：{message_count}

🤖 实时 AI 响应"""
    
    else:
        return call_ollama(f"你是 DJI 无人机销售助理。用户命令：{command}。请简短回答。")

try:
    while True:
        try:
            # 获取更新
            params = {"timeout": 30}
            if last_update_id:
                params["offset"] = last_update_id
            
            response = requests.get(f"{BASE_URL}/getUpdates", params=params, timeout=35)
            updates = response.json().get("result", [])
            
            for update in updates:
                update_id = update.get("update_id")
                message = update.get("message", {})
                
                if message:
                    # 提取信息
                    text = message.get("text", "")
                    chat_id = message.get("chat", {}).get("id")
                    user = message.get("from", {})
                    user_name = user.get("first_name", "")
                    
                    if text and chat_id:
                        message_count += 1
                        timestamp = time.strftime('%H:%M:%S')
                        print(f"[{timestamp}] 收到消息 #{message_count}")
                        print(f"   用户: {user_name}")
                        print(f"   内容: {text}")
                        
                        # 发送"正在输入"状态
                        try:
                            requests.post(
                                f"{BASE_URL}/sendChatAction",
                                json={"chat_id": chat_id, "action": "typing"},
                                timeout=5
                            )
                        except:
                            pass
                        
                        # 生成响应
                        if text.startswith("/"):
                            reply = handle_command(text, user_name)
                        else:
                            # 构建 AI 提示
                            prompt = f"""你是 DJI 无人机的专业销售顾问。

客户问题：{text}

请用专业、友好的语气回答，重点突出产品特性和优势。回答要简洁（100字以内）。

如果问题与 DJI 无人机无关，礼貌地引导回到产品话题。"""
                            
                            print(f"   🤖 AI 思考中...")
                            reply = call_ollama(prompt)
                        
                        # 发送回复
                        try:
                            send_response = requests.post(
                                f"{BASE_URL}/sendMessage",
                                json={
                                    "chat_id": chat_id,
                                    "text": reply,
                                    "reply_to_message_id": message.get("message_id")
                                },
                                timeout=10
                            )
                            
                            if send_response.json().get("ok"):
                                print(f"   ✅ 已回复（{len(reply)} 字）")
                            else:
                                print(f"   ❌ 回复失败")
                        except Exception as e:
                            print(f"   ❌ 发送异常: {e}")
                        
                        print()
                
                # 更新 offset
                if update_id >= (last_update_id or 0):
                    last_update_id = update_id + 1
        
        except requests.exceptions.Timeout:
            # 超时是正常的（长轮询）
            pass
        except Exception as e:
            print(f"❌ 错误: {e}")
            time.sleep(5)

except KeyboardInterrupt:
    print("\n")
    print("="*60)
    print("  ⏹️  Bot 已停止")
    print("="*60)
    print(f"  总共处理了 {message_count} 条消息")
    print(f"  使用 AI 模型: {OLLAMA_MODEL}")
    print("="*60)


