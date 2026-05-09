# PMOS 环境变量说明

## 总原则

1. 只提交变量名和示例
2. 不提交真实密钥
3. 能晚接的外部连接器先晚接
4. 先完成本地启动，再逐步补 GitHub、Notion、Dataki 等能力

## 核心变量

1. `PORT`
2. `AI_OS_ROOT`
3. `DEFAULT_PROVIDER`

这些变量决定最基础的服务启动和默认模型路由。

## 模型提供方相关变量

1. `ANTHROPIC_API_KEY`
2. `GOOGLE_AI_STUDIO_API_KEY`
3. `OPENAI_COMPATIBLE_API_KEY`
4. `OPENAI_COMPATIBLE_BASE_URL`
5. `OPENAI_COMPATIBLE_MODEL`

如果首跑只验证工程启动，不必一次性把所有模型变量都填满。

## 可选外部连接器变量

1. `NOTION_API_KEY`
2. `NOTION_PAGE_ID`
3. `NOTION_DATABASE_ID`
4. `FIGMA_API_KEY`
5. `WEB_FETCH_USER_AGENT`

这些变量用于知识同步、设计接入和外部抓取，不是首跑阻塞项。

## 可选本地自动化变量

1. `DINGTALK_MEETING_IMPORT_MODE`
2. `DINGTALK_EXE_PATH`
3. `DINGTALK_EXPORT_ROOT`

这些变量只在你确实要做本地自动化时再填。

## 推荐填写顺序

1. 先填服务启动所需最小变量
2. 再填当前要用的模型变量
3. 最后再接 Notion、Figma、Dataki 相关外部连接器
