#!/bin/bash
# GI 游戏内参 - 生产环境部署脚本

set -e

echo "=========================================="
echo "  GI 游戏内参 - 生产环境部署"
echo "=========================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: docker-compose 未安装"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "请复制 .env.example 并填写配置"
    exit 1
fi

echo "📋 检查环境变量..."
source .env 2>/dev/null || true

if [ -z "$QWEN_API_KEY" ]; then
    echo "⚠️  警告: QWEN_API_KEY 未配置，LLM 功能将不可用"
fi

echo ""
echo "🚀 开始部署..."
echo ""

# 停止旧服务
echo "🛑 停止旧服务..."
docker-compose down

# 构建镜像
echo ""
echo "🔨 构建镜像..."
docker-compose build

# 启动服务
echo ""
echo "▶️  启动服务..."
docker-compose up -d

# 等待服务就绪
echo ""
echo "⏳ 等待服务就绪..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker-compose ps

echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "服务访问:"
echo "  - GI 后端:     http://localhost:8003"
echo "  - RSSHub:      http://localhost:1200"
echo "  - WeWe RSS:    http://localhost:4000"
echo "  - changedetection: http://localhost:5000"
echo ""
echo "查看日志: docker-compose logs -f gi-backend"
echo "停止服务: docker-compose down"
echo ""
