# Frontend Presentation Boundary

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 前端职责

前端负责把 ResponseContract、SemanticResultContract 与 DisclosureProjection 渲染为主消息、右侧披露、动作入口、移动端堆叠流。

## 不负责

- 不做业务事实判断。
- 不从自然语言正文反推业务状态。
- 不私有化 action/evidence/source/tool schema。
- 不把右侧披露内容混入主消息。

## 工程要求

未知 componentBinding 必须 fallback。大表格、大图表、长 trace、artifact 需懒加载或虚拟化。Trace 缺失只能显示观测降级，不改变业务结果。
