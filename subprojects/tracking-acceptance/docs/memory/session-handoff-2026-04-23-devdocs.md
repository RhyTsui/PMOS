# Session Handoff - 2026-04-23

## 用户本轮真实要求

- 目标不是 demo 式概览，而是更接近正式的开发者文档。
- 用户明确指出想要的范式更接近开放平台/开发者中心文档，而不是项目总结稿。
- 用户还要求：
  - 文档要能直接点开地址查看
  - 不要以 Markdown 成品为主
  - 需要多个版本对比
  - 需要额外产出一份 Excel 对比文件
- 用户给了对标参考：
  - `https://open.oceanengine.com/labels/7`
- 用户补充了一个参考业务需求文档：
  - `E:\AI\ai-os\docs\sources\inbox\《代号Q》埋点文档.xlsx`
- 用户最终判断：
  - 之前产出的“总册 / 概览”思路不对
  - 要切到“开发者文档站”思路继续做

## 本轮已落地文件

### 第一批文档包（旧思路，保留但不建议继续主用）

目录：

- `E:\AI\ai-os\subprojects\tracking-acceptance\docs\deliverables\huahua-tracking-docs\`

其中包括：

- `index.html`
- `huahua-human-overview.svg`
- `huahua-human-integration-manual.html`
- `huahua-human-requirements-spec.html`
- `huahua-ai-structured-spec.html`
- `huahua-version-comparison.html`
- `huahua-doc-versions-compare.xlsx`
- 3 个附录页

这批文件的价值：

- 已经沉淀了 `花花世界` 的基础事实、链路、字段、冲突
- 可作为素材库继续复用

这批文件的问题：

- 用户明确反馈“不满意”
- 问题不是有没有内容，而是文档形态不对
- 更像项目整理物，不像真正开发者文档

### 第二批文档包（当前推荐主线）

目录：

- `E:\AI\ai-os\subprojects\tracking-acceptance\docs\deliverables\huahua-devdocs\`

当前已生成页面：

- `index.html`
- `getting-started.html`
- `client-sdk-integration.html`
- `server-event-integration.html`
- `event-reference.html`
- `field-reference.html`
- `flows-and-acceptance.html`
- `changelog-and-compatibility.html`
- `styles.css`

这一批是按“开发者文档站”思路重组的。

## 当前判断

### 已经做对的部分

- 已经不再沿用“概览 / 总册”作为唯一主线
- 已切换成开发者文档站结构：
  - 首页
  - 快速开始
  - 客户端 SDK 接入
  - 服务端事件接入
  - 事件参考
  - 字段参考
  - 流程、验收与排障
  - 变更与兼容

### 还远远不够的部分

- 现在 `huahua-devdocs` 只是结构对了，内容深度还不够
- 还没有达到开放平台/正式开发者文档的密度
- 具体缺口包括：
  - 客户端 SDK 接入还不够接口化
  - 服务端事件接入还不够逐事件契约化
  - 事件参考还不够 event-by-event
  - 字段参考还不够字典化
  - 验收页还缺更明确 checklist / 时序图 / 问题定位路径

## 已确认的源资料事实

### 花花世界主资料

- `E:\AI\ai-os\docs\sources\inbox\『花花世界』RM版·数据埋点_V251222.xlsx`
- `E:\AI\ai-os\docs\sources\inbox\SDK行为日志埋点表.xlsx`
- `E:\AI\ai-os\docs\sources\inbox\数据埋点梳理-20241223.xlsx`

### 新增参考资料

- `E:\AI\ai-os\docs\sources\inbox\《代号Q》埋点文档.xlsx`

对 `《代号Q》埋点文档.xlsx` 的已确认结构：

- `埋点清单`
- `服务器自定义事件`
- `客户端自定义事件`
- `客户端-前置流程`
- `客户端-新手引导`

用户认为它虽然简单，但至少是“业务完整需求”，这一判断是对的。

## 已确认的关键事实约束

- 当前资料能证明客户端接入面主要是：
  - `GSSDK.getInstance().call("analytics", "track", info)`
  - `getTrackingInfo`
- 当前资料不能证明存在项目组直接调用的公开 REST 上报 API
- 因此后续文档不能乱编：
  - `POST /track`
  - 鉴权头
  - 网关地址
  - app_secret / token 等

只能在“最佳实践建议”层说明：

- 如果后续要升级成正式平台型文档，应补充这些内容

## 下一步推荐工作顺序

重启后不要回去继续修旧的 `huahua-tracking-docs` 主体内容。主线应该切到：

1. 以 `huahua-devdocs` 作为唯一继续迭代目录
2. 优先重写这 4 页内容：
   - `client-sdk-integration.html`
   - `server-event-integration.html`
   - `event-reference.html`
   - `field-reference.html`
3. 重写目标：
   - 更像开放平台开发者文档
   - 少讲“项目理解”
   - 多讲“接口 / 请求体 / 字段 / 约束 / 示例 / 错误 / 验收”
4. 然后补：
   - `flows-and-acceptance.html`
   - `changelog-and-compatibility.html`

## 明确不该继续做的事

- 不要再扩写“概览型总册”
- 不要再新增更多横向版本，除非用户明确要求
- 不要继续把旧的 `huahua-human-*` 系列当主交付
- 不要伪造不存在的 HTTP API

## 用户重启后应直接查看的路径

如果要继续接着干，优先从这里打开：

- `E:\AI\ai-os\subprojects\tracking-acceptance\docs\deliverables\huahua-devdocs\index.html`

其次可参考旧材料：

- `E:\AI\ai-os\subprojects\tracking-acceptance\docs\deliverables\huahua-tracking-docs\huahua-human-requirements-spec.html`
- `E:\AI\ai-os\subprojects\tracking-acceptance\docs\deliverables\huahua-tracking-docs\huahua-human-integration-manual.html`
- `E:\AI\ai-os\subprojects\tracking-acceptance\docs\deliverables\huahua-tracking-docs\huahua-doc-versions-compare.xlsx`

## 一句话总结

这轮真正有价值的结论不是“已经写好了什么”，而是：

`文档方向已从项目概览切换到开发者文档站，但当前只完成了正确结构，内容仍需继续下沉到开放平台式的接口/字段/约束/示例层。`
