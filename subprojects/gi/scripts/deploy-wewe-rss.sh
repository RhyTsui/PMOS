#!/bin/bash
# WeWe RSS 自动部署脚本
# 使用方法：重启 Docker 后运行此脚本

set -e

echo "========================================="
echo "WeWe RSS 自动部署脚本"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker 是否运行
echo "检查 Docker 状态..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker 未运行${NC}"
    echo "请先启动 Docker Desktop，然后重新运行此脚本"
    exit 1
fi
echo -e "${GREEN}✓ Docker 运行正常${NC}"
echo ""

# 停止并删除旧容器（如果存在）
echo "清理旧容器..."
docker stop wewe-rss 2>/dev/null || true
docker rm wewe-rss 2>/dev/null || true
echo -e "${GREEN}✓ 清理完成${NC}"
echo ""

# 拉取镜像
echo "拉取 WeWe RSS 镜像..."
if docker pull cooderl/wewe-rss:latest; then
    echo -e "${GREEN}✓ 镜像拉取成功${NC}"
else
    echo -e "${YELLOW}警告: 主镜像源失败，尝试备用源...${NC}"

    # 尝试备用镜像源
    MIRRORS=(
        "dockerhub.icu/cooderl/wewe-rss:latest"
        "hub.rat.dev/cooderl/wewe-rss:latest"
        "docker.1panel.live/cooderl/wewe-rss:latest"
    )

    SUCCESS=false
    for mirror in "${MIRRORS[@]}"; do
        echo "尝试: $mirror"
        if docker pull "$mirror"; then
            docker tag "$mirror" cooderl/wewe-rss:latest
            echo -e "${GREEN}✓ 从备用源拉取成功${NC}"
            SUCCESS=true
            break
        fi
    done

    if [ "$SUCCESS" = false ]; then
        echo -e "${RED}错误: 所有镜像源都失败${NC}"
        echo ""
        echo "请手动执行以下步骤："
        echo "1. 在有网络的机器上拉取镜像："
        echo "   docker pull cooderl/wewe-rss:latest"
        echo ""
        echo "2. 导出镜像："
        echo "   docker save cooderl/wewe-rss > wewe-rss.tar"
        echo ""
        echo "3. 传输到本机并导入："
        echo "   docker load < wewe-rss.tar"
        echo ""
        echo "4. 重新运行此脚本"
        exit 1
    fi
fi
echo ""

# 创建数据卷
echo "创建数据卷..."
docker volume create wewe-data 2>/dev/null || true
echo -e "${GREEN}✓ 数据卷创建完成${NC}"
echo ""

# 启动容器
echo "启动 WeWe RSS 容器..."
docker run -d \
  --name wewe-rss \
  -p 4000:4000 \
  -e DATABASE_URL=sqlite:/data/wewe.db \
  -v wewe-data:/data \
  --restart always \
  cooderl/wewe-rss:latest

echo -e "${GREEN}✓ WeWe RSS 启动成功${NC}"
echo ""

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo "检查服务状态..."
if curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ WeWe RSS 服务运行正常${NC}"
else
    echo -e "${YELLOW}警告: 服务可能还在启动中，请稍后访问${NC}"
fi
echo ""

# 显示访问信息
echo "========================================="
echo -e "${GREEN}部署完成！${NC}"
echo "========================================="
echo ""
echo "访问地址: http://localhost:4000"
echo "         http://10.236.14.27:4000"
echo ""
echo "下一步操作："
echo "1. 访问上述地址"
echo "2. 使用微信扫码登录（需要微信读书账号）"
echo "3. 添加公众号（游戏那点事Gamez 等）"
echo "4. 获取 RSS 地址"
echo "5. 运行 add-wechat-sources.sh 添加到 GI 系统"
echo ""
echo "查看日志: docker logs -f wewe-rss"
echo "停止服务: docker stop wewe-rss"
echo "重启服务: docker restart wewe-rss"
echo ""
