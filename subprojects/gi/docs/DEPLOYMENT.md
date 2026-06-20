# 游戏内参 GI 部署指南

本文档介绍如何使用 Docker Compose 一键部署游戏内参（GI）情报系统。

## 系统架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   前端 UI   │────▶│   后端 API   │────▶│  SQLite DB  │
│  (Nginx)    │     │  (Node.js)   │     │             │
│   :80       │     │   :8003      │     │             │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  RSSHub    │  │ WeWe RSS   │  │ Scrapling  │
    │  (RSS订阅) │  │ (公众号)   │  │ (采集引擎) │
    │  :1200     │  │  :4000     │  │  :8888     │
    └────────────┘  └────────────┘  └────────────┘
```

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd gi
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填写必要的配置
vim .env
```

**必填配置项**：

```bash
# 通义千问 API Key（用于 LLM 抽取）
QWEN_API_KEY=your_api_key_here

# 如果使用 Dataki 知识库（可选）
DATAKI_BASE_URL=http://your-dataki-instance
DATAKI_API_KEY=your_dataki_api_key
```

**获取通义千问 API Key**：
1. 访问 https://dashscope.console.aliyun.com/
2. 注册/登录阿里云账号
3. 创建 API Key
4. 复制 Key 到 .env 文件

### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 访问系统

- **前端界面**：http://localhost
- **后端 API**：http://localhost:8003
- **API 文档**：http://localhost:8003/api-docs
- **RSSHub**：http://localhost:1200
- **WeWe RSS**：http://localhost:4000
- **changedetection**：http://localhost:5000

## 服务说明

### 核心服务

| 服务 | 端口 | 说明 |
|------|------|------|
| gi-frontend | 80 | 前端界面（Nginx） |
| gi-backend | 8003 | 后端 API（Node.js） |
| scrapling | 8888 | 自适应采集引擎 |

### 数据源服务

| 服务 | 端口 | 说明 |
|------|------|------|
| rsshub | 1200 | RSS 订阅生成器 |
| wewe-rss | 4000 | 微信公众号 RSS |
| changedetection | 5000 | 网页变更监控 |

## 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart gi-backend

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f gi-backend
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 清理未使用的镜像
docker image prune -f
```

### 数据备份

```bash
# 备份数据库
docker-compose exec gi-backend cp /app/data/gi.db /app/data/gi.db.backup
docker-compose cp gi-backend:/app/data/gi.db.backup ./backup/gi.db.backup

# 恢复数据库
docker-compose cp ./backup/gi.db gi-backend:/app/data/gi.db
docker-compose restart gi-backend
```

## 配置说明

### 环境变量

详见 `.env.example` 文件，主要配置项：

| 变量 | 说明 | 必填 |
|------|------|------|
| QWEN_API_KEY | 通义千问 API Key | 是 |
| QWEN_BASE_URL | API 基础 URL | 否 |
| DATAKI_BASE_URL | Dataki 实例地址 | 否 |
| DATAKI_API_KEY | Dataki API Key | 否 |
| PORT | 后端服务端口 | 否 |
| NODE_ENV | 运行环境 | 否 |

### 存储卷

| 卷名 | 挂载路径 | 说明 |
|------|----------|------|
| gi_data | /app/data | GI 数据库和配置 |
| rsshub_data | /data | RSSHub 缓存 |
| wewe_data | /data | WeWe RSS 数据库 |
| changedetection_data | /data | changedetection 数据 |

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose logs gi-backend

# 检查端口占用
netstat -tlnp | grep 8003

# 检查磁盘空间
df -h
```

### 数据库连接失败

```bash
# 检查数据库文件权限
docker-compose exec gi-backend ls -la /app/data/

# 重置数据库（谨慎操作）
docker-compose exec gi-backend rm /app/data/gi.db
docker-compose restart gi-backend
```

### LLM 调用失败

```bash
# 检查 API Key 配置
docker-compose exec gi-backend env | grep QWEN

# 测试 API 连通性
docker-compose exec gi-backend curl -v ${QWEN_BASE_URL}/models
```

### 采集失败

```bash
# 检查 RSSHub 状态
curl http://localhost:1200/healthz

# 检查 WeWe RSS 状态
curl http://localhost:4000

# 查看采集日志
docker-compose logs -f gi-backend | grep "采集"
```

## 性能优化

### 调整资源配置

编辑 `docker-compose.yml`，为服务添加资源限制：

```yaml
services:
  gi-backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 启用缓存

在 `.env` 中配置：

```bash
# RSSHub 缓存
CACHE_TYPE=redis
REDIS_URL=redis://redis:6379
```

并在 `docker-compose.yml` 中添加 Redis 服务。

## 安全建议

1. **修改默认端口**：修改 docker-compose.yml 中的端口映射
2. **启用 HTTPS**：在 Nginx 配置中添加 SSL 证书
3. **限制访问 IP**：使用防火墙或 Nginx 配置限制访问
4. **定期更新**：定期更新 Docker 镜像和依赖包
5. **备份数据**：定期备份数据库和配置文件

## 监控

### 健康检查

所有服务都配置了健康检查，可以通过以下命令查看：

```bash
docker inspect --format='{{.State.Health.Status}}' gi-backend
```

### 日志收集

建议配置日志收集系统（如 ELK Stack）：

```yaml
services:
  gi-backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 扩展部署

### 多实例部署

如果需要扩展后端服务，可以：

```bash
# 启动多个后端实例
docker-compose up -d --scale gi-backend=3
```

需要在前面添加负载均衡器（如 Nginx、HAProxy）。

### 生产环境建议

1. 使用反向代理（Nginx/Traefik）
2. 配置 SSL/TLS
3. 使用外部数据库（PostgreSQL/MySQL）
4. 使用 Redis 作为缓存
5. 配置日志收集系统
6. 配置监控告警（Prometheus + Grafana）

## 常见问题

### Q: 如何修改前端端口？

A: 修改 docker-compose.yml 中 gi-frontend 的端口映射：

```yaml
ports:
  - '8080:80'  # 改为 8080
```

### Q: 如何更新 RSSHub？

A: RSSHub 使用官方镜像，更新命令：

```bash
docker-compose pull rsshub
docker-compose up -d rsshub
```

### Q: 如何查看数据库内容？

A: 使用 SQLite 客户端连接：

```bash
docker-compose exec gi-backend sqlite3 /app/data/gi.db
```

### Q: 如何禁用某个服务？

A: 注释掉 docker-compose.yml 中对应的服务配置，或使用 profile：

```yaml
services:
  changedetection:
    profiles:
      - "tools"  # 只在 docker-compose --profile tools up 时启动
```

## 技术支持

如有问题，请：
1. 查看项目文档
2. 检查日志输出
3. 提交 Issue 到项目仓库

---

**最后更新**：2026-06-20
