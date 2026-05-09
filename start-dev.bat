@echo off
chcp 65001 >nul
echo ===============================================
echo   A股选股系统 - 一键启动
echo ===============================================

set PROJECT_DIR=D:\Ai工作\wby_股票选股页面\a-stock-picker

if not exist "%PROJECT_DIR%" (
    echo ❌ 错误：找不到项目目录
    echo    路径：%PROJECT_DIR%
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%" || exit /b 1
echo ✅ 已进入项目目录：%CD%

:: 检查 node_modules
if not exist "node_modules\" (
    echo ⚠️  未找到 node_modules，正在安装依赖（首次运行，请稍候）...
    call npm install
    echo ✅ 依赖安装完成
)

:: 清理旧进程
echo 🔧 清理旧进程...
taskkill //F //IM node.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo 🚀 正在启动开发服务器...
echo    启动后访问：http://localhost:5173/
echo    关闭此窗口即可停止服务器
echo ===============================================
echo.

call npm run dev
