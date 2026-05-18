# ChoKoNu v1.0 工作台模块前后端联调规格

- 项目：`连弩-AI自动化质量控制平台 / ChoKoNu`
- 模块：`工作台`
- 日期：`2026-04-29`
- 状态：`active`
- 文档类型：`模块前后端联调规格`
- 前置分析：`docs/analysis/modules/ChoKoNu-v1.0-工作台模块分析-2026-04-28.md`
- 前置 PRD：`docs/product/modules/ChoKoNu-v1.0-工作台模块详细PRD-2026-04-28.md`
- 前置设计：`docs/design/modules/ChoKoNu-v1.0-工作台模块设计图说明-2026-04-28.md`
- 前置前端：`frontend/src/pages/WorkbenchApp.jsx`

## 1. 文档定位

本文只回答一件事：

`工作台模块前端已经有壳层实现后，前后端应该怎么真正联起来。`

它不负责：

1. 业务对象接口细节
2. 项目台、需求台、用例台等子模块自己的对象 schema
3. 登录协议实现细节

它负责：

1. 壳层级接口
2. 壳层级字段
3. 前端替换 mock 的落点
4. 联调顺序
5. 联调验收规则

## 2. 当前前端实现边界

当前工作台前端已经实现了以下壳层能力：

1. 左侧 9 个一级入口
2. 顶部全局区
3. 全局项目 / 环境 / 版本范围选择
4. 总览轻入口页
5. 中间主画布壳层
6. 右侧上下文区语义
7. 移动端导航抽屉与详情抽屉

当前前端仍使用 `frontend/src/data/mockData.js` 提供壳层和页面假数据。

因此联调目标不是重写前端，而是按壳层接口逐步替换 mock。

## 3. 联调总原则

### 3.1 骨架先联，业务后联

工作台模块只先联以下壳层级能力：

1. 当前用户
2. 工作台权限
3. 可访问项目
4. 最近上下文恢复
5. 全局待办摘要
6. 门禁阻断摘要

不在本模块联调中解决：

1. 业务列表分页策略
2. 业务详情字段完整性
3. 复杂搜索能力

### 3.2 稳定字段优先

壳层接口优先返回稳定摘要字段，不要一开始就透出完整业务对象结构。

### 3.3 允许首版弱实现

`v1.0` 可以先做到：

1. 搜索框仅占位不生效
2. 最近任务只返回 3-10 条轻量摘要
3. 右侧上下文区只返回当前对象轻量摘要

## 4. 前端替换点

当前前端里需要被真实接口替换的核心 mock 来源：

### 4.1 `frontend/src/data/mockData.js`

壳层级直接相关：

1. `navItems`
2. `projectOptions`
3. `topSignals`
4. `pendingItems`
5. `recentRuns`

### 4.2 `frontend/src/pages/WorkbenchApp.jsx`

需要接入后端的状态：

1. `currentProjectKey`
2. `currentEnv`
3. `currentVersion`
4. `globalSearch`
5. `activePage`
6. `detailCollapsed`

### 4.3 `frontend/src/pages/workbench/OverviewPage.jsx`

需要接入后端的摘要：

1. 当前待办
2. 重点风险
3. 最近执行

## 5. 壳层级接口清单

## 5.1 获取当前用户

### 接口

`GET /api/workbench/me`

### 作用

返回当前登录用户的壳层级身份信息。

### 响应建议

```json
{
  "id": "user-qa-duty",
  "name": "QA 值班",
  "role": "qa",
  "displayRole": "测试 / 测开",
  "avatarUrl": null
}
```

### 前端使用位置

1. 顶部全局区“当前用户”
2. 权限判断的前置身份信息

## 5.2 获取工作台权限

### 接口

`GET /api/workbench/permissions`

### 作用

控制：

1. 哪些一级入口可见
2. 哪些入口可访问
3. 哪些壳层动作可见

### 响应建议

```json
{
  "workspaces": {
    "overview": true,
    "projects": true,
    "requirements": true,
    "cases": true,
    "execution": true,
    "trace": true,
    "reports": true,
    "review": true,
    "gate": true
  },
  "actions": {
    "createProject": true,
    "createRequirement": true,
    "startExecution": true,
    "submitReview": true,
    "makeGateDecision": false
  }
}
```

### 前端使用位置

1. 左侧导航显隐
2. 路由守卫
3. 按钮显隐

## 5.3 获取可访问项目列表

### 接口

`GET /api/workbench/projects`

### 作用

为工作台壳层提供“当前项目选择器”和最小项目上下文。

### 响应建议

```json
{
  "items": [
    {
      "key": "retail-agent",
      "name": "零售客服 Agent",
      "env": "预发",
      "coverage": "Agent / MCP / AI 评测",
      "aiCoding": "已接通 PRD 解析、Diff 回归建议和失败回传。"
    }
  ]
}
```

### 前端使用位置

1. 顶部项目选择器
2. 左下角当前上下文卡片
3. 总览页当前项目摘要

## 5.4 获取壳层摘要

### 接口

`GET /api/workbench/summary`

### 请求参数建议

1. `projectKey`
2. `environment`
3. `versionRange`

### 作用

返回顶部和总览页所需的轻量摘要。

### 响应建议

```json
{
  "todoReview": 14,
  "blockedVersions": 3,
  "pendingItems": [
    "3 条需求待生成用例草案",
    "2 个项目待补启动命令与环境变量"
  ],
  "recentRuns": [
    {
      "id": "run-1001",
      "name": "退款链路回归",
      "project": "零售客服 Agent",
      "executor": "MCP / Agent",
      "status": "失败",
      "trigger": "AI Coding",
      "startedAt": "今天 14:20"
    }
  ],
  "riskItems": [
    {
      "id": "risk-1",
      "title": "退款工具二次确认缺失",
      "level": "阻断",
      "project": "零售客服 Agent",
      "source": "MCP Trace",
      "actionTarget": {
        "workspace": "trace",
        "objectId": "trace-refund-2201"
      }
    }
  ]
}
```

### 前端使用位置

1. 顶部待复核数字
2. 顶部阻断版本数字
3. 总览页待办
4. 总览页重点风险
5. 总览页最近执行

## 5.5 获取最近上下文恢复信息

### 接口

`GET /api/workbench/context`

### 作用

登录后恢复最近工作上下文。

### 响应建议

```json
{
  "currentProjectKey": "retail-agent",
  "currentEnv": "预发",
  "currentVersion": "2026.04.27",
  "activePage": "requirements",
  "activeObject": {
    "workspace": "requirements",
    "objectId": "req-1",
    "objectTitle": "退款工具增加二次确认"
  }
}
```

### 前端使用位置

1. 初始页面恢复
2. 当前项目 / 环境 / 版本恢复
3. 当前对象上下文恢复

## 5.6 保存最近上下文

### 接口

`POST /api/workbench/context`

### 作用

在用户切换项目、环境、版本、页面或对象后保存最近上下文。

### 请求建议

```json
{
  "currentProjectKey": "retail-agent",
  "currentEnv": "预发",
  "currentVersion": "2026.04.27",
  "activePage": "reports",
  "activeObject": {
    "workspace": "reports",
    "objectId": "report-1"
  }
}
```

## 6. 状态映射规则

## 6.1 前端状态与接口来源

| 前端状态 | 来源接口 | 说明 |
| --- | --- | --- |
| `currentProjectKey` | `/api/workbench/context` + `/api/workbench/projects` | 恢复后需校验项目仍可访问 |
| `currentEnv` | `/api/workbench/context` | 若失效回退到项目默认环境 |
| `currentVersion` | `/api/workbench/context` | 首版允许只保存字符串 |
| `todoReview` | `/api/workbench/summary` | 顶部摘要 |
| `blockedVersions` | `/api/workbench/summary` | 顶部摘要 |
| `activePage` | hash 路由 + `/api/workbench/context` | 路由优先，恢复次之 |

## 6.2 状态失效回退

1. 若恢复的 `projectKey` 不存在，则回退到项目列表第一项。
2. 若恢复的 `activePage` 无权限，则回退到 `overview`。
3. 若恢复对象已失效，则保留页面，不保留对象。

## 7. 联调顺序

必须按以下顺序联调，不要并行乱接：

### 第一步：用户与权限

1. `GET /api/workbench/me`
2. `GET /api/workbench/permissions`

目标：

1. 顶部用户真实化
2. 导航显隐真实化
3. 路由守卫真实化

### 第二步：项目与上下文恢复

1. `GET /api/workbench/projects`
2. `GET /api/workbench/context`

目标：

1. 顶部项目选择器真实化
2. 初始项目 / 环境 / 版本恢复
3. 当前页面恢复

### 第三步：顶部与总览摘要

1. `GET /api/workbench/summary`

目标：

1. 待复核与阻断版本真实化
2. 总览待办、风险、最近执行真实化

### 第四步：上下文保存

1. `POST /api/workbench/context`

目标：

1. 页面切换可持续恢复
2. 项目切换后可回到最近工作状态

## 8. 前端改造清单

前端在联调时应按下面顺序替换：

1. 用 `/api/workbench/me` 替换顶部用户写死值
2. 用 `/api/workbench/permissions` 替换 `navItems` 全可见假设
3. 用 `/api/workbench/projects` 替换 `projectOptions`
4. 用 `/api/workbench/summary` 替换 `topSignals`、`pendingItems`、`riskItems`、`recentRuns`
5. 用 `/api/workbench/context` 替换初始默认状态

## 9. 后端实现约束

### 9.1 首版不要做太重

后端不要一开始就做：

1. 全局复杂搜索
2. 跨对象多条件聚合统计
3. 动态布局配置

首版只要稳定支撑壳层即可。

### 9.2 字段稳定性高于完备性

宁可字段少，也要保证：

1. 名称稳定
2. 类型稳定
3. 空值语义明确

## 10. 联调验收标准

### 10.1 壳层验收

1. 登录后能进入真实工作台
2. 顶部用户、项目、环境、版本范围不是写死假值
3. 左侧导航按权限真实显示

### 10.2 总览验收

1. 总览页待办来自真实摘要接口
2. 风险项点击后能跳到对应工作台
3. 最近执行列表来自真实摘要接口

### 10.3 恢复验收

1. 刷新后能恢复最近项目
2. 刷新后能恢复最近工作台
3. 无权限或失效状态能自动回退

## 11. 当前结论

工作台模块的前后端联调不是“把所有页面都接真数据”，而是：

`先把统一壳层接成真的。`

只要这层接真：

1. 后续每个业务工作台都能接到统一上下文上
2. 模块间切换不会继续漂移
3. 工作台模块就算真正闭环完成

## 12. 当前结果判定

- 当前模块：`工作台`
- 当前阶段：`前后端联调规格`
- 产品要求层：`solved`
  工作台模块从分析、PRD、设计图、前端到联调规格已经形成闭环真源。
- 用户需求层：`partial`
  还需要真实后端按本规格接入，才能把工作台模块彻底从 mock 推到可联调状态。

