chcp 65001 >nul
@echo off
set PATH=C:\Users\evanc\.real\.bin\node;%PATH%
cd /d D:\Ai工作\wby_股票选股页面\a-stock-picker
echo ===== A股选股系统 启动中... =====
call npm run dev
echo.
echo 退出码:%errorlevel%
pause
