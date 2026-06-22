#!/bin/bash
# 添加微信公众号源到 GI 系统
# 前提：WeWe RSS 已部署并配置好公众号

set -e

GI_API="http://10.236.14.27:8003"
WEWE_API="http://10.236.14.27:4000"

echo "========================================="
echo "添加微信公众号源到 GI 系统"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 WeWe RSS 是否运行
echo "检查 WeWe RSS 服务..."
if ! curl -s "$WEWE_API" > /dev/null 2>&1; then
    echo -e "${RED}错误: WeWe RSS 服务未运行${NC}"
    echo "请先运行 deploy-wewe-rss.sh 部署 WeWe RSS"
    exit 1
fi
echo -e "${GREEN}✓ WeWe RSS 服务正常${NC}"
echo ""

# 检查 GI API 是否可用
echo "检查 GI API..."
if ! curl -s "$GI_API/health" > /dev/null 2>&1; then
    echo -e "${RED}错误: GI API 不可用${NC}"
    echo "请确保 GI 后端服务正在运行"
    exit 1
fi
echo -e "${GREEN}✓ GI API 正常${NC}"
echo ""

# 定义要添加的公众号列表
declare -a ACCOUNTS=(
    "游戏那点事Gamez"
    "游戏葡萄"
    "游戏陀螺"
    "触乐"
    "游研社"
    "游戏茶馆"
    "竞核"
    "游戏干线"
    "手游那点事"
    "罗斯基"
)

echo "========================================="
echo "准备添加以下公众号："
echo "========================================="
for account in "${ACCOUNTS[@]}"; do
    echo "  - $account"
done
echo ""

# 添加每个公众号
echo "开始添加公众号源..."
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

for account in "${ACCOUNTS[@]}"; do
    echo -e "${BLUE}添加: $account${NC}"

    # 构建 RSS URL（假设 WeWe RSS 的格式）
    RSS_URL="$WEWE_API/feeds/$account.xml"

    # 构建请求数据
    JSON_DATA=$(cat <<EOF
{
  "name": "$account",
  "shortName": "${account:0:10}",
  "sourceType": "wechat_mp",
  "accessMethod": "rss",
  "baseUrl": "$WEWE_API",
  "feedUrl": "$RSS_URL",
  "enabled": true,
  "priority": "P0",
  "tags": ["公众号", "P0", "微信", "WeWe RSS"]
}
EOF
)

    # 发送请求
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$GI_API/api/v1/sources" \
        -H "Content-Type: application/json" \
        -d "$JSON_DATA")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}  ✓ 添加成功${NC}"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}  ✗ 添加失败 (HTTP $HTTP_CODE)${NC}"
        echo "    响应: $BODY"
        ((FAIL_COUNT++))
    fi

    # 短暂延迟，避免请求过快
    sleep 0.5
done

echo ""
echo "========================================="
echo "添加完成！"
echo "========================================="
echo -e "成功: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "失败: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "下一步："
    echo "1. 在 WeWe RSS 中配置对应的公众号"
    echo "2. 验证 RSS 地址是否可访问"
    echo "3. 在 GI 系统中测试采集"
    echo ""
    echo "验证命令："
    echo "  curl $GI_API/api/v1/sources | jq '.data[] | select(.sourceType == \"wechat_mp\")'"
fi

echo ""
