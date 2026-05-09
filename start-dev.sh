#!/bin/bash
# ==========
#  A股选股系统 - 一键启动脚本
#  使用方法：
#    1. 在Git Bash里输入：bash /d/Ai工作/wby_股票选股页面/a-stock-picker/start-dev.sh
# ==========

echo "==========="
echo "  A股选股系统 - 启动开发服务器"
echo "==========="

PROJECT_DIR="D:\Ai工作\wby_股票选股页面\a-stock-picker"

# 检查目录
if [ ! -d "/d/Ai工作/wby_股票选股页面/a-stock-picker" ]; then
    echo "❌ 错误：找不到项目目录"
    read -p "按回车键退出..."
    exit 1
fi

cd "/d/Ai工作/wby_股票选股页面/a-stock-picker" || exit 1
echo "✅ 已进入项目目录"

# 清理旧进程
echo "🔧 清理旧进程..."
pkill -f "vite" 2>/dev/null
pkill -f "node.*5173" 2>/dev/null
pkill -f "node.*5174" 2>/dev/null
pkill -f "node.*5175" 2>/dev/null
sleep 2

# ============================================================
#  关键：用 Windows CMD 启动 npm，它认识 npm 在哪
# ============================================================
echo ""
echo "🚀 正在启动开发服务器..."
echo "   启动后访问：http://localhost:5173/"
echo "   按 Ctrl+C 停止服务器"
echo "==========="
echo ""

cmd //c "cd /d D:\\Ai工作\\wby_股票选股页面\\a-stock-picker && npm run dev"
