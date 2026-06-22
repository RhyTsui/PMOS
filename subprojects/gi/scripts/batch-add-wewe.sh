#!/bin/bash
# 通过搜狗微信搜索批量添加公众号到 WeWe RSS
# 用法: bash scripts/batch-add-wewe.sh

WEWE_URL="http://localhost:4000"
AUTH_CODE="gi2026"
COOKIES="/tmp/sogou_batch_cookies"

# 待添加的公众号列表（名称|搜索关键词）
ACCOUNTS=(
  "竞核|竞核 游戏"
  "手游那点事|手游那点事"
  "罗斯基|罗斯基 游戏"
  "米哈游|米哈游 官方"
  "腾讯游戏|腾讯游戏 官方"
  "网易游戏|网易游戏 官方"
  "莉莉丝游戏|莉莉丝游戏"
  "鹰角网络|鹰角网络"
  "叠纸游戏|叠纸游戏"
  "库洛游戏|库洛游戏"
  "伽马数据|伽马数据"
  "手游矩阵|手游矩阵"
  "游戏开发者GAD|游戏开发者 GAD"
  "独立出海联合体|独立出海联合体"
  "Sensor Tower|Sensor Tower 游戏"
  "data.ai|data.ai 游戏"
  "游戏价值榜|游戏价值榜"
)

add_account() {
  local name="$1"
  local query="$2"
  local encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))" 2>/dev/null || echo "$query" | sed 's/ /%20/g')

  # Step 1: Search Sogou
  curl -sL -c "$COOKIES" -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
    -o /tmp/sogou_page.html \
    "https://weixin.sogou.com/weixin?type=2&query=${encoded}&ie=utf8" 2>/dev/null

  local LINK=$(grep -oP 'href="(/link\?[^"]+)"' /tmp/sogou_page.html | head -1 | sed 's/href="//;s/"$//;s/&amp;/\&/g')
  if [ -z "$LINK" ]; then
    echo "  ✗ 搜狗搜索无结果"
    return 1
  fi

  # Step 2: Follow redirect with cookies
  sleep 1
  local WX_URL=$(curl -sL -b "$COOKIES" -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
    "https://weixin.sogou.com${LINK}" 2>/dev/null | grep -oP "url\s*\+=\s*'[^']*'" | sed "s/url\s*+=\s*'//;s/'//" | tr -d '\n')

  if [ -z "$WX_URL" ] || ! echo "$WX_URL" | grep -q "mp.weixin"; then
    echo "  ✗ 无法提取微信URL（可能触发验证码）"
    return 1
  fi

  # Step 3: Fetch article with WeChat UA to get biz info
  sleep 1
  local ARTICLE=$(curl -sL -A "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.44" \
    "$WX_URL" 2>/dev/null)

  local BIZ=$(echo "$ARTICLE" | grep -oP 'var biz = "[^"]+"' | head -1 | sed 's/var biz = "//;s/"//')
  local NICK=$(echo "$ARTICLE" | grep -oP 'var nickname = htmlDecode\("[^"]+"\)' | head -1 | sed 's/var nickname = htmlDecode("//;s/")//')
  local COVER=$(echo "$ARTICLE" | grep -oP 'var ori_head_img_url = "[^"]+"' | head -1 | sed 's/var ori_head_img_url = "//;s/"//')

  if [ -z "$BIZ" ] || [ -z "$NICK" ]; then
    echo "  ✗ 无法获取公众号信息"
    return 1
  fi

  # Decode biz to numeric ID
  local NUM_ID=$(echo "$BIZ" | base64 -d 2>/dev/null)
  local FEED_ID="MP_WXS_${NUM_ID}"

  # Step 4: Add feed to WeWe RSS
  local TIMESTAMP=$(date +%s)
  local RESULT=$(curl -s -X POST "${WEWE_URL}/trpc/feed.add" \
    -H "authorization: ${AUTH_CODE}" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"${FEED_ID}\",\"mpName\":\"${NICK}\",\"mpCover\":\"${COVER}\",\"mpIntro\":\"\",\"updateTime\":${TIMESTAMP}}" 2>/dev/null)

  if echo "$RESULT" | grep -q '"result"'; then
    echo "  ✓ ${NICK} (${FEED_ID})"
    return 0
  else
    local ERR=$(echo "$RESULT" | grep -oP '"message":"[^"]*"' | head -1)
    echo "  ✗ 添加失败: ${ERR}"
    return 1
  fi
}

echo "=== 批量添加公众号到 WeWe RSS ==="
echo "共 ${#ACCOUNTS[@]} 个公众号待添加"
echo ""

SUCCESS=0
FAILED=0

for entry in "${ACCOUNTS[@]}"; do
  NAME="${entry%%|*}"
  QUERY="${entry##*|}"
  echo "[$((SUCCESS+FAILED+1))/${#ACCOUNTS[@]}] ${NAME}..."

  if add_account "$NAME" "$QUERY"; then
    ((SUCCESS++))
  else
    ((FAILED++))
  fi

  sleep 3
done

echo ""
echo "=== 完成 ==="
echo "成功: ${SUCCESS}"
echo "失败: ${FAILED}"
