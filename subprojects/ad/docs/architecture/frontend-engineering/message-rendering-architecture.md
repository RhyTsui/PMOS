# Message Rendering Architecture

> Scope: `Chat Presentation Layer`
> Canonical layers: `SemanticResultContract -> regions[] -> componentBinding -> Component Registry -> Renderer`

## 定位

正文、结果、过程与依据都属于消息返回展示域，但职责不同：

- `MessageSurface` 负责正文
- `SemanticResultContract` 负责结构化结果
- `MessageDisclosureView` 负责过程与依据
- `Component Registry` 负责把 region 挂到真实组件

## 基本规则

1. 页面层不手工拼接业务结果。
2. 正文和结果都必须来自契约，不得直接读 `raw_result`、`tool_calls` 或 `process_events`。
3. `screenType` 只决定页面语义，不决定具体组件。
4. `componentBinding` 是唯一组件挂载入口。
5. `ChatContainer` 只做消息壳和编排，不做业务解释。

## 渲染链路

```txt
Message
→ MessageContract / SemanticResultContract
→ presentation result
→ regions[]
→ componentBinding
→ registry
→ renderer
→ React tree
```

