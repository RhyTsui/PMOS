@echo off
REM GI 游戏内参 - Windows 生产环境部署脚本

echo ==========================================
echo   GI 游戏内参 - 生产环境部署
echo ==========================================
echo.

REM 检查 Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误: Docker 未安装
    exit /b 1
)

REM 检查 .env 文件
if not exist .env (
    echo ❌ 错误: .env 文件不存在
    echo 请复制 .env.example 并填写配置
    exit /b 1
)

echo 📋 检查环境变量...
echo.
echo 🚀 开始部署...
echo.

REM 停止旧服务
echo 🛑 停止旧服务...
docker-compose down

REM 构建镜像
echo.
echo 🔨 构建镜像...
docker-compose build

REM 启动服务
echo.
echo ▶️  启动服务...
docker-compose up -d

REM 等待服务就绪
echo.
echo ⏳ 等待服务就绪...
timeout /t 5 /nobreak >nul

REM 检查服务状态
echo.
echo 📊 服务状态:
docker-compose ps

echo.
echo ==========================================
echo   部署完成!
echo ==========================================
echo.
echo 服务访问:
echo   - GI 后端:     http://localhost:8003
echo   - RSSHub:      http://localhost:1200
echo   - WeWe RSS:    http://localhost:4000
echo   - changedetection: http://localhost:5000
echo.
echo 查看日志: docker-compose logs -f gi-backend
echo 停止服务: docker-compose down
echo.
