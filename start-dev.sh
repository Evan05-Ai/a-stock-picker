#!/bin/bash
# ============================================================
#  A股选股系统 - 一键启动脚本
#  使用方法：
#    1. 在Git Bash里输入：bash /d/Ai工作/wby_股票选股页面/a-stock-picker/start-dev.sh
#    2. 或者双击此文件（需配置Git Bash为默认打开方式）
# ============================================================

echo "==============================================="
echo "  A股选股系统 - 启动开发服务器"
echo "==============================================="

# 项目目录
PROJECT_DIR="/d/Ai工作/wby_股票选股页面/a-stock-picker"

# ============================================================
#  关键修复：把 node/npm 所在目录加入 PATH
#  用户在 Windows CMD 里 where node 显示：
#  C:\Users\evanc\AppData\Roaming\npm\node.exe
#  所以把这个目录加到 PATH
# ============================================================
export PATH="$PATH:/c/Users/evanc/AppData/Roaming/npm"

# 同时把项目 node_modules/.bin 加入 PATH
export PATH="$PATH:$PROJECT_DIR/node_modules/.bin"

echo "✅ PATH 已配置，node/npm 应该可用了"
node --version 2>/dev/null && echo "  node 可用" || echo "  ⚠️  node 仍不可用"
npm --version 2>/dev/null && echo "  npm 可用" || echo "  ⚠️  npm 仍不可用"

# 检查目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 错误：找不到项目目录"
    echo "   路径：$PROJECT_DIR"
    read -p "按回车键退出..."
    exit 1
fi

cd "$PROJECT_DIR" || exit 1
echo "✅ 已进入项目目录：$(pwd)"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "⚠️  未找到 node_modules，正在安装依赖（首次运行，请稍候）..."
    npm install
    echo "✅ 依赖安装完成"
fi

# 杀掉之前的 vite 进程（防止端口占用）
echo "🔧 清理旧进程..."
pkill -f "vite" 2>/dev/null
pkill -f "node.*5173" 2>/dev/null
pkill -f "node.*5174" 2>/dev/null
pkill -f "node.*5175" 2>/dev/null
sleep 2

# 启动开发服务器
echo ""
echo "🚀 正在启动开发服务器..."
echo "   启动后访问：http://localhost:5173/"
echo "   （如5173被占用，Vite会自动换端口，以终端显示为准）"
echo "   按 Ctrl+C 停止服务器"
echo "==============================================="
echo ""

npm run dev
