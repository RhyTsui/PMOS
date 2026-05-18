# Dataki v1.1 前台文件接管与组件映射
- 版本：v1.1
- 日期：2026-04-24
- 状态：Draft
- 适用范围：Dataki v1.1 前台改造落点
- 读者对象：前端、设计、AI

## 1. 结论

WeKnora 现有前端已经直接依赖 `@yoka-ui/ui`，不是和组件库脱节的状态。

证据：

- `subprojects/knowledge-base/WeKnora/frontend/package.json`

这意味着 Dataki v1.1 不需要先解决“能不能接组件库”，而是应该直接进入：

1. 找准前台文件切口
2. 把现有页面结构改成 Dataki 口径
3. 用组件库约束登录页、工作台和主对话框

## 2. 当前关键文件

### 2.1 登录页

文件：

- `subprojects/knowledge-base/WeKnora/frontend/src/views/auth/Login.vue`

当前观察：

1. 页面已是高度定制化大页，不是简单表单壳
2. 已存在 `OIDC` 登录按钮
3. 当前主登录方式仍是邮箱 + 密码
4. 页面内已经嵌入了一段 Yoka UI 组件展示内容，但它是 showcase，不是 Dataki 真正登录结构

Dataki 改造方向：

1. 保留页面级壳体和大背景机制
2. 去掉以 WeKnora 为中心的品牌内容
3. 把登录结构改成：
   - 首次超管注册入口
   - 小闪登录快主入口
   - 企业登录扩展槽位
   - 失败 / 未授权 / 组织未命中状态区
4. 禁止退回只做扫码 / 手机号双态

优先组件映射：

1. `YkContainer`
2. `FlexGrid`
3. `InputTheme`
4. `ButtonWithProgress`
5. `Empty`
6. `YkDrawer`

### 2.2 工作台容器

文件：

- `subprojects/knowledge-base/WeKnora/frontend/src/views/platform/index.vue`

当前观察：

1. 结构非常薄，只负责：
   - 左侧 `Menu`
   - 主区 `RouterView`
   - 上传遮罩
   - 全局设置模态框
2. 是最适合 Dataki 先接管的主壳文件

Dataki 改造方向：

1. 保留这个壳，不重写布局机制
2. 把它升级成 Dataki 工作台容器
3. 未来在这里接：
   - Dataki 顶部信息条
   - 用户组织态
   - 当前知识范围态
   - 全局挂载态

优先组件映射：

1. `YkContainer`
2. `YkDrawer`
3. `FlexGrid`
4. `YkTabs`

### 2.3 主对话框

文件：

- `subprojects/knowledge-base/WeKnora/frontend/src/views/chat/index.vue`

当前观察：

1. 这是当前真正的主消费入口
2. 已有推荐问题、引用、消息流、输入框、知识库编辑回跳
3. 结构完整，不适合首轮大拆

Dataki 改造方向：

1. 保留消息流与输入机制
2. 把上层表达改成 Dataki 的“知识与数据相遇”消费语义
3. 优先新增或改造：
   - 模型名称展示区
   - 知识挂载展示区
   - MCP 状态展示区
   - 来源与引用表达区

优先组件映射：

1. `业务组件/AiChat`
2. `YkDrawer`
3. `YkTabs`
4. `Empty`
5. `ButtonWithProgress`

## 3. 当前页面与 Dataki 要求的差距

### 3.1 登录页差距

当前：

- 邮箱密码登录为主
- OIDC 为补充
- 页面叙事仍然是 WeKnora

目标：

- 首次超管注册 + 小闪登录快 + 企业扩展槽位

结论：

- 登录页是 P0 改造项

### 3.2 工作台差距

当前：

- 还是 WeKnora 平台语义

目标：

- Dataki 工作台语义

结论：

- 平台容器是 P0.5 改造项

### 3.3 主对话框差距

当前：

- 已经具备工作入口基础，但 Dataki 的模型、知识、MCP 控制表达不够清晰

目标：

- 主对话框成为 Dataki 首版第一工作入口

结论：

- 对话页是 P1 改造项

## 4. 实施顺序建议

1. 先改 `Login.vue`
2. 再改 `platform/index.vue`
3. 再改 `chat/index.vue`
4. 最后再回收菜单与路由命名

## 5. 下一步可直接执行的代码工作

1. 在 `Login.vue` 中拆出 Dataki 登录结构草骨架
2. 把小闪登录快入口、扩展槽位和错误态先占住位置
3. 在 `platform/index.vue` 中为 Dataki 顶部态预留容器
4. 在 `chat/index.vue` 中补模型 / 知识 / MCP 的展示骨架
