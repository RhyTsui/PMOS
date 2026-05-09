# PMOS 第二设备模拟验证记录

- date: `2026-05-09`
- scope: `local second-machine simulation`
- repo: `product-repo`
- status: `partial`

## 验证目的

在真实第二台设备尚未执行前，先按“陌生机器首跑”的方式，对独立 `PMOS product repo` 做一轮最小启动模拟验证，确认它至少具备可安装、可构建、可启动、可返回基础页面的能力。

## 验证环境

1. 仓库目录：`E:\AI\ai-os\product-repo`
2. 环境变量样例：使用 `.env.example`
3. 默认端口：`4312`
4. 启动命令：`npm start`

## 已验证命令

1. `npm run lint`
2. `npm run build`
3. `npm start`
4. `GET http://127.0.0.1:4312/api/health`
5. `GET http://127.0.0.1:4312/`

## 结果

1. `npm run lint`：通过
2. `npm run build`：通过
3. `npm start`：成功启动
4. `/api/health`：`200`
5. `/`：`200`
6. 根路径返回内容长度：`21403`

## 当前结论

这轮验证说明：

1. 独立产品仓已经具备最小启动能力
2. 文档与真源清理没有打坏独立构建
3. 可以继续作为 `preview / internal beta` 发布准备依据

## 仍未覆盖的部分

1. 真实第二台设备上的 clone / install / start
2. 操作者在陌生设备上不依赖原作者上下文的完整阅读验证
3. 外部连接器在陌生设备上的接入验证
4. workflow 最小链路在陌生设备上的实跑验证

## 对正式发布判断的影响

- 对 `preview / internal beta`：正向加分
- 对 `public v1.0`：仍不足以单独放行，真实第二设备验证仍是必要项
