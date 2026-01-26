#!/bin/bash
# 简单的停止脚本

echo "正在停止服务..."

# 停止后端 (按进程名)
pkill -f "start_server.py" 2>/dev/null
pkill -f "uvicorn.*main:app" 2>/dev/null

# 停止前端 (按进程名)
pkill -f "vite" 2>/dev/null

# 或者按端口停止
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

sleep 1
echo "✓ 服务已停止"
