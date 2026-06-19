# Contract Guardrail 深化规范

## 1. 目标

Guardrail 不只检查文档是否存在，还要阻止结构分裂和绕过统一契约。

## 2. 必须检查的违规模式

### 2.1 私有动作字段

禁止新增：

```txt
chartActions
tableButtons
cardCta
ctaButtons
localActions
vizActions
messageActions
```

除非出现在 adapter 的 legacy 输入定义中，且最终映射到 `ActionContract`。

### 2.2 私有 evidence/source 字段

禁止新增：

```txt
dataSources
sourceItems
citationItems
evidenceItems
proofs
references
```

除非最终映射到 `EvidenceRef` / `SourceRef`。

### 2.3 绕过 contracts 真源

禁止在页面目录中重新定义：

```txt
type ActionType
interface ActionContract
interface SemanticResultContract
interface EvidenceRef
interface SourceRef
interface RuntimeDisplayProtocol
```

### 2.4 AI Insight 无证据

出现以下字段时必须检查 evidence/source：

```txt
insight
recommendation
risk
diagnosis
explanation
confidence
```

### 2.5 Renderer 无 fallback

每个 renderer 注册必须包含 fallback，或 registry 必须注入 global fallback。

### 2.6 用户页面直接消费旧 schema

禁止最终页面直接消费：

```txt
ResponseContract
ReportQueryViewModel
MetricExplainerUISchema
VizSpec
AgentProcessEvent
```

合法例外：

```txt
adapters/*
migration tests
legacy compatibility tests
```

## 3. CI 阻断等级

| 类型 | 等级 |
|---|---|
| 私有 Action 字段 | error |
| 重新定义契约真源 | error |
| 页面直接消费旧 schema | error |
| AI Insight 无 evidence/source | warning -> 两周后升级 error |
| renderer 无 fallback | error |
| Visual token 硬编码 | warning |

## 4. 执行方式

```bash
npx tsx scripts/guardrails/check-contract-governance.ts
```

建议加入：

```txt
pre-commit: warning
pull request: error
main branch CI: error
```
