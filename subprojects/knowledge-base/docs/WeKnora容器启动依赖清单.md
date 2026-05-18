# WeKnora 容器启动依赖清单

- 版本：v0.1
- 日期：2026-04-23
- 状态：已完成首轮梳理
- 用途：在继续走容器路线的前提下，明确启动 WeKnora 所需的外部镜像依赖和当前阻塞点

## 1. 当前结论

- `docker` 和 `docker compose` 已可用。
- `docker compose up -d` 已执行过，但卡在镜像拉取。
- 当前不是 compose 文件错误，而是外部镜像访问失败。

## 2. docker-compose 关键镜像依赖

默认会涉及以下镜像：

- `wechatopenai/weknora-ui`
- `wechatopenai/weknora-app`
- `wechatopenai/weknora-sandbox`
- `wechatopenai/weknora-docreader`
- `paradedb/paradedb:v0.22.2-pg17`
- `redis:7.0-alpine`
- `minio/minio:RELEASE.2025-09-07T16-13-09Z`
- `jaegertracing/all-in-one:1.76.0`
- `neo4j:2025.10.1`
- `qdrant/qdrant:v1.16.2`
- `milvusdb/milvus:v2.6.11`
- `semitechnologies/weaviate:1.28.4`
- `dexidp/dex:latest`

## 3. 本轮阻塞定位

已验证访问失败或无法连通的方向包括：

- `registry-1.docker.io:443`
- `ghcr.io:443`
- 若干常见公共镜像代理域名

这说明：

- 当前宿主机没有可用的 Docker 外网代理链路。
- 也没有已经生效的公共镜像加速配置。

## 4. 后续可执行路线

### 路线 A：配置 Docker Desktop 代理

适合场景：

- 你已有公司代理、科学网络或可用 HTTP/HTTPS 代理地址。

目标：

- 让 Docker Desktop 能直接访问镜像仓库。

### 路线 B：配置镜像加速源

适合场景：

- 你有内网镜像仓库或稳定镜像站。

目标：

- 把核心镜像从加速源拉下来，再继续 `docker compose up -d`。

### 路线 C：预拉取 / 离线导入

适合场景：

- 目标环境联网困难，但可以从别的机器导出镜像。

目标：

- 在其他机器拉取所需镜像，导出为 tar，再导入本机 Docker。

## 5. 对现有架构的影响

低影响：

- 只要采用容器方式运行，当前知识库项目和 PMAIOS 主仓都不需要为部署方式改架构。

中影响：

- 若未来长期依赖特殊代理或离线镜像流程，最好把镜像准备纳入 `knowledge-base` 子项目的标准开工门禁。

## 6. 当前建议

1. 优先解决 Docker Desktop 的代理或镜像源。
2. 打通后直接重试 `subprojects/knowledge-base/WeKnora/docker-compose.yml`。
3. 容器栈跑通后，再做前台菜单收敛和业务接管。
