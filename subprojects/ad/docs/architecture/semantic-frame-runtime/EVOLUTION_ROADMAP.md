# Semantic Frame Runtime 演进路线图

> **Status**: Living Document  
> **Version**: 1.0.0  
> **Last Updated**: 2024-01-XX  
> **Parent**: [Semantic Frame Runtime Spec](./00_SEMANTIC_FRAME_RUNTIME_SPEC.md)

## 1. 概述

本文档追踪 Semantic Frame Runtime 从 P0 实现到 P2 Agent 化的演进过程。它既是未来工作的路线图，也是架构债务的记录。

---

## 2. 已完成里程碑

### 2.1 P0: Semantic Frame + Execution Gate ✅

**状态**：已完成  
**测试覆盖**：62/62 测试通过

#### 交付内容

**核心能力**：
- ✅ 多维度执行门控（5 个条件全部满足）
- ✅ Execution Mode 授权机制
- ✅ Service Intent Policy 分类
- ✅ Capability Purpose 对齐检查
- ✅ read_only_lookup 阻止 report_execution
- ✅ diagnostic_evidence 与 report_query 分离
- ✅ capabilityReportMatch 仅作为候选证据

**关键组件**：
- ✅ `report-execution-gate.ts` - 多维度门控实现
- ✅ `service-intent-execution-policy.ts` - 策略定义
- ✅ Execution mode 授权逻辑
- ✅ Capability 归一化处理

**测试覆盖**：
- ✅ `report-execution-gate.test.ts` (10 个测试)
- ✅ `report-execution-integration.test.ts` (11 个测试)
- ✅ 字段解释场景
- ✅ 报表数据查询场景
- ✅ 诊断场景
- ✅ 帮助场景
- ✅ 包场景
- ✅ capabilityReportMatch 候选证据验证

#### 架构意义

- **取代单点授权**：不再依赖单独的 capability match 或关键词 match
- **多维度验证**：route + executionMode + serviceIntent + capability 联合授权
- **精确控制**：read_only_lookup 阻止 report_execution，但允许 dictionary/schema/knowledge lookup
- **场景分离**：diagnostic_evidence 与 data_execution 使用不同的执行路径

### 2.2 P1-1: Semantic Frame 集成到主链路 ✅

**状态**：已完成  
**测试覆盖**：62/62 测试通过

#### 交付内容

**Semantic Frame 提前生成**：
- ✅ 在 `deriveUserRequirement` 之前生成 semantic frame
- ✅ 在 `deriveRequestRouteDecision` 之前生成 semantic frame
- ✅ Semantic frame 成为 route/userRequirement/gate 的主要语义输入

**消费 Semantic Frame**：
- ✅ `deriveUserRequirement(message, context, semanticFrame)` 优先使用 semanticFrame.serviceIntent
- ✅ `deriveUserRequirement` 优先使用 semanticFrame.semanticTask 进行 task 决定
- ✅ `deriveRequestRouteDecision(message, { semanticFrame })` 使用 semantic frame adapter
- ✅ `shouldEnterReportExecution({ semanticFrame })` 检查 executionMode

**遗留逻辑降级**：
- ✅ 关键词推断降级为 fallback（仅当 semanticFrame 为空或不可用时）
- ✅ 主链路不再依赖业务关键词正则

#### 架构意义

- **语义真源确立**：Semantic frame 成为 route decision、user requirement、execution gate 的主要输入
- **解耦理解与执行**：语义解释与执行授权分离
- **向后兼容**：遗留关键词逻辑作为 fallback 保留，确保稳定性

#### 主链路（当前状态）

```
User Input
    ↓
deriveRequestSemanticFrame(message)
    ↓ semanticFrame { speechAct, semanticTask, executionMode, serviceIntent, ... }
deriveUserRequirement(message, context, semanticFrame)
    ↓ userRequirement { task, serviceIntent, metrics, dimensions, ... }
deriveRequestRouteDecision(message, { semanticFrame, ... })
    ↓ route { intent_type, requiresExecution, ... }
capability discovery
    ↓ selectedCapability { capabilityPurpose, supportedServiceIntents, ... }
execution gate
    ↓ shouldEnter { shouldEnter, blockedBy, reasons, policy }
tool / KB / schema / web execution
    ↓ result
result normalization → evidence ledger → answer composer → render surface
```

---

## 3. 计划中里程碑

### 3.1 P1-2: Domain Ontology / Report Catalog ⏳

**状态**：计划中  
**优先级**：高  
**预估工作量**：2-3 周

#### 目标

- 创建 Domain Ontology 结构用于业务对象类型
- 实现 Object Resolver，咨询 Domain Ontology
- 将业务信号检测从硬编码正则迁移到基于 ontology 的解析
- 将业务对象链接到 capability manifest

#### 交付内容

- [ ] `domain-ontology.ts`: Domain Ontology 数据结构
- [ ] `object-resolver.ts`: Object resolver 实现
- [ ] `report-catalog.json`: Report catalog 配置
- [ ] 迁移 `semantic-frame-resolver.ts` 使用 Object Resolver
- [ ] 更新 `semantic-frame-contract.ts` 包含解析的对象引用
- [ ] Object resolver 测试

#### 成功标准

- 业务对象检测不再依赖硬编码正则
- Object resolver 可以将"素材报表"解析为结构化的 BusinessObjectReference
- 对象引用可以链接到 capability manifest
- 所有现有测试仍然通过

#### 解决的架构债务

- 移除 `semantic-frame-resolver.ts` 中的硬编码业务关键词
- 建立理解（resolver）和领域知识（ontology）之间的清晰分离

#### 风险

- **中等**：Object resolver 是需要彻底测试的新组件
- **缓解**：全面的测试覆盖，带 fallback 的渐进式迁移

### 3.2 P1-3: /api/chat 真实回归测试 ⏳

**状态**：计划中  
**优先级**：高  
**预估工作量**：1 周

#### 目标

- 为 `/api/chat` 端点添加端到端集成测试
- 测试通过 semantic frame → route → gate → execution 的真实请求流程
- 在生产类环境中验证 semantic frame 行为

#### 交付内容

- [ ] `/api/chat` 集成测试套件
- [ ] 覆盖所有 P0 测试场景的测试用例
- [ ] 用于能力测试的 Mock MCP 服务器
- [ ] 测试数据 fixtures

#### 成功标准

- 所有 P0 测试场景在 `/api/chat` 集成测试中通过
- Semantic frame 在生产流程中正确生成和消费
- 执行门控正确授权/阻止请求

#### 风险

- **高**：没有集成测试意味着更高的生产问题风险
- **缓解**：在 P1-2 之后优先进行 P1-3

### 3.3 P1-4: DataVizRenderer columnSchema ⏳

**状态**：计划中  
**优先级**：中  
**预估工作量**：3-5 天

#### 目标

- 为 VizTableSpec 添加 columnSchema 支持
- 实现中文字段头渲染
- 保持与 `columns: string[]` 的向后兼容性

#### 交付内容

- [ ] 更新 `VizTableSpec` 包含可选的 `columnSchema`
- [ ] 更新 `semanticResultToVizSpec` 填充 columnSchema
- [ ] 更新 `DataVizRenderer` 消费 columnSchema
- [ ] columnSchema 渲染测试

#### 成功标准

- 当提供 columnSchema 时，表头显示中文标签
- 当未提供 columnSchema 时，回退到英文字段名
- 对现有表渲染没有破坏性变更

---

## 4. 未来里程碑（P2）

### 4.1 Evidence Ledger ⏳

**状态**：未开始  
**优先级**：中  
**预估工作量**：2-3 周

#### 目标

- 实现结构化证据追踪
- 追踪证据来源、新鲜度和归因
- 为 answer composer 和 disclosure 提供证据账本

#### 交付内容

- [ ] Evidence ledger contract
- [ ] Evidence ledger 实现
- [ ] 与执行门控和 answer composer 的集成
- [ ] 证据新鲜度管理

### 4.2 Render Surface Policy ⏳

**状态**：未开始  
**优先级**：中  
**预估工作量**：2-3 周

#### 目标

- 实现基于 semantic frame 的渲染表面选择
- 支持多表面渲染（chat、workspace、admin）
- 将渲染表面策略与执行门控协调

#### 交付内容

- [ ] Render surface policy contract
- [ ] Render surface policy 实现
- [ ] 与 semantic frame 和 answer composer 的集成
- [ ] 多表面渲染协调

### 4.3 LLM 审查层 ⏳

**状态**：未开始  
**优先级**：低  
**预估工作量**：1-2 周

#### 目标

- 添加基于 LLM 的 semantic frame 审查
- 为 semantic frame 字段提供置信度评分
- 启用基于 LLM 反馈的 semantic frame 优化

#### 交付内容

- [ ] LLM 审查层实现
- [ ] 置信度评分机制
- [ ] Semantic frame 优化逻辑
- [ ] 与 semantic frame resolver 的集成

### 4.4 Agent 化 ⏳

**状态**：未开始  
**优先级**：低  
**预估工作量**：4-6 周

#### 目标

- 将 semantic frame runtime 转换为基于 agent 的架构
- 支持多 agent 协作
- 启用影子模式和风险审批工作流

#### 交付内容

- [ ] Agent runtime 实现
- [ ] 多 agent 协作协议
- [ ] 影子模式实现
- [ ] 风险审批工作流

---

## 5. 架构债务

### 5.1 request-understanding.ts 中的遗留关键词 Fallback

**严重程度**：中  
**状态**：活跃  
**负责**：P1-2

#### 描述

以下函数仍包含遗留关键词正则模式：
- `hasStrongReportIntent`: `/(查数|查询|看下|...)/i`
- `inferServiceIntentFromRequirement`: `/(生成|导出|订阅|报告|...)/i`
- `deriveUserRequirement` 回填：`/(日报|周报|月报|报告|...)/i`

#### 影响

- 这些模式现在仅是 fallback，不是主路径
- 如果 semantic frame 为空或不可用，它们仍可能导致错误路由
- 它们代表应该迁移的架构债务

#### 迁移计划

1. P1-2: 实现 Domain Ontology / Object Resolver
2. P1-2: 迁移 `semantic-frame-resolver.ts` 使用 Object Resolver
3. P1-3: 添加全面测试以验证 semantic frame 总是被填充
4. P1-4: 在验证 semantic frame 覆盖后移除遗留关键词模式

#### 风险

- **低**：Semantic frame 现在是主路径，遗留模式仅是 fallback
- **缓解**：全面的测试覆盖确保 semantic frame 正确生成

### 5.2 semantic-frame-resolver.ts 中的业务信号

**严重程度**：中  
**状态**：活跃  
**负责**：P1-2

#### 描述

`semantic-frame-resolver.ts` 包含硬编码的业务信号：
- `detectSpeechAct`: `/(查|查询|看下|数据|报表|日报|...)/i`
- `detectBusinessObjects`: `/(报表|日报|周报|月报)/i`

#### 影响

- 业务对象检测依赖硬编码正则
- 与 Domain Ontology 或 Capability Manifest 没有连接
- 难以维护和扩展

#### 迁移计划

1. P1-2: 创建 Domain Ontology 结构
2. P1-2: 实现咨询 Domain Ontology 的 Object Resolver
3. P1-2: 迁移 `semantic-frame-resolver.ts` 使用 Object Resolver
4. P1-2: 移除硬编码业务信号

#### 风险

- **中等**：Object resolver 是需要彻底测试的新组件
- **缓解**：全面的测试覆盖，带 fallback 的渐进式迁移

### 5.3 缺少 /api/chat 真实回归测试

**严重程度**：高  
**状态**：未开始  
**负责**：P1-3

#### 描述

没有 `/api/chat` 端点的端到端集成测试。

#### 影响

- 无法在生产类环境中验证 semantic frame 行为
- 无法捕获 semantic frame 和执行门控之间的集成问题
- 生产问题风险

#### 迁移计划

1. P1-3: 创建 `/api/chat` 集成测试套件
2. P1-3: 为所有 P0 测试场景添加测试用例
3. P1-3: Mock MCP 服务器用于能力测试
4. P1-3: 在 CI/CD 管道中运行测试

#### 风险

- **高**：没有集成测试意味着更高的生产问题风险
- **缓解**：在 P1-2 之后优先进行 P1-3

### 5.4 缺少浏览器 E2E 测试

**严重程度**：中  
**状态**：未开始  
**负责**：P1-3

#### 描述

没有基于浏览器的端到端测试。

#### 影响

- 无法验证 semantic frame 结果的前端渲染
- 无法捕获 UI/UX 问题
- 前端回归风险

#### 迁移计划

1. P1-3: 设置 Playwright 或类似 E2E 测试框架
2. P1-3: 为关键用户流程创建 E2E 测试场景
3. P1-3: 在 CI/CD 管道中运行 E2E 测试

#### 风险

- **中等**：没有 E2E 测试意味着更高的前端问题风险
- **缓解**：如果单元/集成测试全面，可以推迟

---

## 6. 迁移优先级

### 6.1 关键（必须做）

1. **P1-2: Domain Ontology / Object Resolver**
   - 移除硬编码业务关键词
   - 建立清晰的架构
   - 启用未来的可扩展性

2. **P1-3: /api/chat 真实回归测试**
   - 验证生产行为
   - 捕获集成问题
   - 降低生产风险

### 6.2 重要（应该做）

3. **P1-4: DataVizRenderer columnSchema**
   - 改善用户体验
   - 完成 P1 交付物

4. **浏览器 E2E 测试**
   - 验证前端渲染
   - 捕获 UI/UX 问题

### 6.3 可选（可以推迟）

5. **Evidence Ledger (P2)**
6. **Render Surface Policy (P2)**
7. **LLM 审查层 (P2)**
8. **Agent 化 (P2)**

---

## 7. 成功指标

### 7.1 P1 成功指标

- ✅ 所有 P0 测试仍然通过（62/62）
- ⏳ Semantic frame 覆盖所有业务对象检测（P1-2）
- ⏳ 主路径中没有硬编码业务关键词（P1-2）
- ⏳ /api/chat 集成测试通过（P1-3）
- ⏳ DataVizRenderer 支持 columnSchema（P1-4）

### 7.2 P2 成功指标

- ⏳ Evidence ledger 追踪所有证据来源（P2）
- ⏳ Render surface policy 支持多表面渲染（P2）
- ⏳ LLM 审查层提供置信度评分（P2）
- ⏳ Agent runtime 支持多 agent 协作（P2）

---

## 8. 风险管理

### 8.1 P1-2 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Object resolver 过于复杂 | 中 | 高 | 从简单实现开始，迭代改进 |
| Domain Ontology 结构错误 | 中 | 高 | 与团队审查，从最小可行 ontology 开始 |
| 迁移破坏现有测试 | 低 | 高 | 全面的测试覆盖，渐进式迁移 |

### 8.2 P1-3 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 集成测试不稳定 | 中 | 中 | 使用稳定的测试 fixtures，重试逻辑 |
| Mock MCP 服务器不完整 | 低 | 中 | 只实现需要的 MCP 工具 |
| 测试运行时间过长 | 低 | 低 | 优化测试执行，并行化 |

---

## 9. 依赖关系

### 9.1 P1-2 依赖
- Domain Ontology 设计审查
- Report catalog 结构定义
- Capability manifest 扩展（如果需要）

### 9.2 P1-3 依赖
- P1-2 完成（在生产中测试 semantic frame）
- Mock MCP 服务器实现
- 测试数据 fixtures

### 9.3 P1-4 依赖
- VizTableSpec contract 扩展
- DataVizRenderer 组件更新

---

## 10. 相关文档

- [Semantic Frame Runtime Spec](./00_SEMANTIC_FRAME_RUNTIME_SPEC.md)
- [Execution Gate 详细设计](./05_EXECUTION_GATE.md)
- [Enterprise AI Chat OS Spec](../ENTERPRISE_AI_CHAT_OS_SPEC.md)
- [实现护栏](../governance/ai-chat-implementation-guardrails.md)

---

## 11. 变更日志

| 日期 | 版本 | 变更 | 作者 |
|------|------|------|------|
| 2024-01-XX | 1.0.0 | 初始路线图（P0/P1-1 完成） | Claude |
