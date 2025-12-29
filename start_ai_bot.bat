@echo off
chcp 65001 >nul
cls

echo ============================================================
echo   DJI 智能销售助理 - Telegram AI Bot
echo ============================================================
echo.

echo [1/3] 停止旧进程...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ 完成

echo.
echo [2/3] 清理消息队列...
curl -s "https://api.telegram.org/bot8255985659:AAH8TAhWi3-F36W5mUHG6bZZ650OT6wNLSM/getUpdates?offset=-1" >nul
echo ✅ 完成

echo.
echo [3/3] 启动 AI Bot...
cd /d %~dp0
start "DJI AI Bot" python telegram_bot_with_ollama.py
timeout /t 2 >nul
echo ✅ 完成

echo.
echo ============================================================
echo   ✅ Bot 已启动！
echo ============================================================
echo.
echo 📱 Bot: https://t.me/RoSP_Hackthon2026_bot
echo 🤖 模型: Ollama qwen2.5:latest
echo.
echo ⏱️  首次响应: 30-40秒 (加载模型)
echo ⏱️  后续响应: 2-5秒
echo.
echo 💡 查看实时日志: 打开弹出的窗口
echo.
pause
