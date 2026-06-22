# 微信公众号采集 - 部署指南

## 当前状态

❌ **WeWe RSS 镜像拉取失败**
- 原因：DaoCloud 镜像源返回 403 Forbidden
- Docker 配置了镜像加速但无法访问

## 解决方案

### 方案 A：修复 Docker 镜像源（推荐）

#### 步骤 1：修改 Docker 配置

编辑或创建 `~/.docker/daemon.json`：

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://dockerhub.icu",
    "https://hub.rat.dev",
    "https://doh.baidubce.com"
  ]
}
```

#### 步骤 2：重启 Docker

```bash
# Windows (Docker Desktop)
# 右键 Docker Desktop 图标 -> Restart

# 或命令行重启
net stop com.docker.service
net start com.docker.service
```

#### 步骤 3：拉取 WeWe RSS

```bash
docker pull cooderl/wewe-rss:latest
```

#### 步骤 4：启动 WeWe RSS

```bash
docker run -d \
  --name wewe-rss \
  -p 4000:4000 \
  -e DATABASE_URL=sqlite:/data/wewe.db \
  -v wewe-data:/data \
  --restart always \
  cooderl/wewe-rss:latest
```

#### 步骤 5：配置 WeWe RSS

1. 访问 http://10.236.14.27:4000
2. 使用微信扫码登录（需要微信读书账号）
3. 添加公众号：
   - 游戏那点事Gamez
   - 游戏葡萄
   - 游戏陀螺
   - 触乐
   - 游研社
   - 等等...

#### 步骤 6：添加到 GI 系统

```bash
# 为每个公众号添加 RSS 源
curl -X POST http://10.236.14.27:8003/api/v1/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "游戏那点事Gamez",
    "shortName": "Gamez",
    "sourceType": "wechat_mp",
    "accessMethod": "rss",
    "baseUrl": "http://10.236.14.27:4000",
    "feedUrl": "http://10.236.14.27:4000/feeds/游戏那点事Gamez.xml",
    "enabled": true,
    "priority": "P0",
    "tags": ["公众号", "P0", "微信"]
  }'
```

---

### 方案 B：使用其他镜像源

如果方案 A 失败，尝试以下镜像源：

```bash
# 尝试多个镜像源
docker pull dockerpull.org/cooderl/wewe-rss:latest
docker pull docker.rainbond.cc/cooderl/wewe-rss:latest
docker pull docker.1panel.live/cooderl/wewe-rss:latest
```

---

### 方案 C：从源码构建

如果所有镜像源都失败，可以从源码构建：

```bash
# 克隆 WeWe RSS 源码
git clone https://github.com/cooderl/wewe-rss.git
cd wewe-rss

# 构建镜像
docker build -t wewe-rss:local .

# 启动
docker run -d \
  --name wewe-rss \
  -p 4000:4000 \
  -e DATABASE_URL=sqlite:/data/wewe.db \
  -v wewe-data:/data \
  --restart always \
  wewe-rss:local
```

---

### 方案 D：使用搜狗微信搜索（临时方案）

如果 WeWe RSS 完全无法部署，可以使用搜狗微信搜索作为临时方案。

**注意**：此方案有反爬机制，不稳定，仅作为临时方案。

已在 GI 系统中实现搜狗微信采集器，但需要：
- 配置代理
- 控制请求频率
- 处理验证码

---

## 验证部署

### 检查 WeWe RSS 是否运行

```bash
# 检查容器状态
docker ps | grep wewe-rss

# 检查服务是否可访问
curl http://10.236.14.27:4000
```

### 检查 GI 系统是否已添加公众号

```bash
# 查看所有源
curl http://10.236.14.27:8003/api/v1/sources | jq '.data[] | select(.sourceType == "wechat_mp")'
```

---

## 常见问题

### Q1: Docker 拉取镜像失败

**解决方案**：
1. 更换镜像源（见方案 B）
2. 使用代理
3. 从源码构建（方案 C）

### Q2: WeWe RSS 无法登录

**解决方案**：
1. 确保微信读书账号正常
2. 检查网络连接
3. 查看 WeWe RSS 日志：`docker logs wewe-rss`

### Q3: 公众号文章采集不到

**解决方案**：
1. 检查 WeWe RSS 中是否已添加该公众号
2. 检查 RSS 地址是否正确
3. 检查 GI 系统中源的配置
4. 查看 GI 系统日志

---

## 下一步

1. **优先尝试方案 A**：修复 Docker 镜像源
2. 如果失败，尝试方案 B 或 C
3. 部署成功后，配置公众号
4. 添加到 GI 系统
5. 验证采集是否正常

---

## 联系支持

如果遇到问题，可以查看：
- WeWe RSS 官方文档：https://github.com/cooderl/wewe-rss
- GI 系统日志：查看后端日志
- Docker 日志：`docker logs wewe-rss`
