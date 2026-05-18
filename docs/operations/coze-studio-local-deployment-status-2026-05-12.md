# Coze Studio 本地部署状态 2026-05-12

- date: `2026-05-12`
- status: `running`
- role: `独立本地部署实例（非 PMOS 默认能力）`

## 当前定位

`Coze Studio` 当前不是 PMOS 子项目，不承担真源、任务主控或最终验收。

并且从当前周期开始：

- 不再作为 `PMOS` 默认开发实现能力
- 不再继续推进集成主线
- 当前仅保留为独立本地部署实例

它当前承担的是：

`implementation-handoff 之后的开发实现能力`

适用方向：

- `agent implementation`
- `workflow implementation`
- `AI app / copilot / chat application implementation`
- `prompt / plugin / knowledge / database resource assembly`

## 本地访问地址

- root: `http://127.0.0.1:8890`
- sign: `http://127.0.0.1:8890/sign`

## 当前运行状态

- Docker Compose stack 已启动
- `coze-web` 已映射到 `127.0.0.1:8890`
- `coze-server` 已启动
- 基础依赖已健康：
  - `mysql`
  - `redis`
  - `elasticsearch`
  - `minio`
  - `etcd`
  - `milvus`
  - `nsq`

## 本轮配置说明

- 本地配置文件：`subprojects/coze-studio/docker/.env`
- 为避免占用现有 `8888`，仅调整了：
  - `WEB_LISTEN_ADDR="127.0.0.1:8890"`

其余当前保持官方默认部署路径。

## 已验证项

1. `docker compose -f subprojects/coze-studio/docker/docker-compose.yml up -d`
2. `docker compose ... ps` 返回 `coze-web / coze-server` 运行中
3. `curl -I http://127.0.0.1:8890` 返回 `HTTP/1.1 200 OK`
4. `curl -I http://127.0.0.1:8890/sign` 返回 `HTTP/1.1 200 OK`

## 尚未完成的手动步骤

要真正进入可用开发态，还需要：

1. 首次注册账号
2. 进入 `admin/#model-management`
3. 配置至少一个可用模型

没有模型配置前：

- 平台可打开
- 但无法完整进行 agent / workflow / app 的实际开发运行

## 与 PMOS 的当前集成状态

当前状态：

- 本地部署仍然可访问
- 但 PMOS 已停止继续把它推进成默认集成能力
- 统一入口卡片已撤下
- 相关文档改为 `parked / reference`
