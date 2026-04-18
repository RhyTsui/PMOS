# PMAIOS 架构决策文档（Architecture Decision Document）

## 1. 架构核心选择

### ❗决策1：必须采用 Control Plane 作为唯一执行中心

原因：
- 防止 agent 自由执行
- 保证 DAG 可控性
- 支持 deterministic execution

---

### ❗决策2：Dify / n8n 必须降级为能力层

原因：
- 它们是工具，不是 OS
- 不具备 state machine 能力
- 不应参与 routing / planning

---

### ❗决策3：Hermes 仅作为 Policy Layer

职责限定：
- permission control
- safety gating
- cost control

禁止：
- routing
- workflow planning
- execution decision

---

### ❗决策4：系统必须引入 Version + Requirement 双系统

原因：
- AI系统天然不可解释
- 必须通过 version + requirement 建立可追溯性

---

### ❗决策5：必须引入 Observability Layer

原因：
- 无 trace = 无 OS
- 无 execution log = 无系统

---

## 2. 架构原则

### P1：Execution First Principle
所有设计必须优先保证执行可控

### P2：Traceability Principle
所有行为必须可追踪

### P3：Separation of Concerns
- Control = execution
- Policy = permission
- Capability = tool
- Automation = external

### P4：Single Source of Truth
Control Plane 是唯一真执行源