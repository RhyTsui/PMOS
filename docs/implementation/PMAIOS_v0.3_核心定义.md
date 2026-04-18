# PMAIOS v0.3 核心定义与验收基线

## 0. 系统定位

**PMAIOS v0.3 = State-driven AI Operating System with Semantic Enhancement Layer**

不是一个工作流工具，而是一个：
- **状态驱动**的 AI 操作系统
- 带**语义增强层** (Hermes)
- 支持**图结构执行** (Graph Execution)
- 具备**长期记忆演化** (Memory Evolution)

---

## 1. 核心原则 (必须死守)

### ① State is Everything
- 所有信息必须进 state
- Agent 只能读写 state，不能"凭空输出"
- State 是系统唯一真相

### ② Graph Controls Execution, Not AI
- AI 不能决定流程，只能改变 state
- 执行由图结构 (Graph) 控制
- 支持动态路由 (非固定流程)

### ③ Hermes Never Decides, Only Enhances
- Hermes 是增强器 (Enhancer)，不是控制器 (Controller)
- 只做：信息补全、语义增强、冲突检测
- 不做：调度 graph、控制 flow、决定路径

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    User Input                            │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 State Builder                            │
│  (Schema Lock - 初始化空 state，定义字段结构)              │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Graph Execution Engine                      │
│                                                          │
│  Nodes: business → user → data → ai → synthesis → review │
│         ↑                    ↓                          │
│         └──── 动态回跳/并行 ────┘                        │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Hermes Overlay Layer                        │
│  (Enhancer Only - 信息补全/语义增强/冲突检测)              │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              State Validator (Review Gate)               │
│  (判断整个 state 是否"可执行"，不只是 PRD)                  │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Memory Evolution System                     │
│  (存储 state 路径/routing history/修复记录/failure pattern)│
└─────────────────────────────────────────────────────────┘
```

---

## 3. State 结构定义

```typescript
interface WorkflowState {
  // 各阶段输出
  business: BusinessAnalysis | null;
  user: UserAnalysis | null;
  data: DataMetrics | null;
  ai: AIAutomation | null;
  synthesis: SynthesisOutput | null;
  review: ReviewResult | null;
  
  // 元数据
  meta: {
    currentStep: string;           // 当前节点
    confidence: number;            // 整体置信度 0-1
    missingFields: string[];       // 缺失字段
    attemptCount: number;          // 尝试次数
    lastTransition: string;        // 上次转移时间
  };
  
  // 记忆
  memory: {
    evolutionLog: EvolutionEntry[];
    failurePatterns: FailurePattern[];
    successPatterns: SuccessPattern[];
  };
  
  // 产物
  artifacts: ArtifactRecord[];
}
```

---

## 4. Node 定义 (纯函数 Agent)

每个节点 = 一个**纯函数**，输入 state，输出 state 增量：

```typescript
type AgentNode = (state: WorkflowState) => Partial<WorkflowState>;

// 示例：User Agent Node
function userNode(state: WorkflowState): Partial<WorkflowState> {
  const userAnalysis = analyzeUser(state.business);
  const confidence = calculateConfidence(userAnalysis);
  
  return {
    user: userAnalysis,
    meta: {
      ...state.meta,
      currentStep: 'user',
      confidence,
    }
  };
}
```

### 4.1 核心 Nodes

| Node | 职责 | 输出字段 |
|------|------|----------|
| `business` | 商业分析 | `business: { roi, cost, revenue, market }` |
| `user` | 用户分析 | `user: { persona, journey, painPoints, scenarios }` |
| `data` | 数据指标 | `data: { metrics, tracking, attribution }` |
| `ai` | AI 自动化 | `ai: { automationRate, agentScope, modelNeeds }` |
| `synthesis` | 合成 PRD | `synthesis: { prd, gaps, solutions }` |
| `review` | 评审决策 | `review: { score, decision, blockers }` |

---

## 5. Edge 定义 (条件转移函数)

边不是"下一步"，而是**条件转移函数**：

```typescript
type RouteFunction = (state: WorkflowState) => string;

// 示例：路由决策
function routeAfterUser(state: WorkflowState): string {
  // 如果用户分析置信度低，跳到数据分析
  if (state.user.confidence < 0.5) {
    return 'data';
  }
  
  // 如果商业分析未验证，回到商业
  if (state.business.validated === false) {
    return 'business';
  }
  
  // 默认继续 AI 分析
  return 'ai';
}
```

### 5.1 允许的路由

| 当前节点 | 可转移到 | 条件 |
|----------|----------|------|
| business | user | 商业分析完成 |
| business | business | 置信度 < 0.5 (重新分析) |
| user | data | 用户分析完成 |
| user | business | 发现商业假设错误 |
| data | ai | 数据指标完整 |
| data | user | 数据与用户分析冲突 |
| ai | synthesis | AI 分析完成 |
| ai | data | AI 发现数据缺失 |
| synthesis | review | PRD 生成完成 |
| synthesis | business | PRD 发现商业缺口 |
| review | presentation | 评审通过 (score >= 80) |
| review | synthesis | 需要修改 (60 <= score < 80) |
| review | business | 评审拒绝 (score < 60) |

---

## 6. Hermes Layer (语义增强)

### 6.1 Hermes 职责

| 功能 | 说明 | 不做什么 |
|------|------|----------|
| **信息补全** | `detectMissing(state)` → `state.missingFields` | 不决定跳过节点 |
| **语义增强** | 添加 `enhancement: { risks, edgeCases }` | 不修改 state 结构 |
| **冲突检测** | 检测 `business vs user` 矛盾 | 不自动修复冲突 |

### 6.2 Hermes 接口

```typescript
interface HermesEnhancer {
  // 检测缺失字段
  detectMissing(state: WorkflowState): string[];
  
  // 增强输出
  enhance(state: WorkflowState): WorkflowState;
  
  // 冲突检测
  detectConflicts(state: WorkflowState): Conflict[];
}
```

---

## 7. Review Gate v3

Review 不只是评审 PRD，而是**验证整个 State 是否可执行**：

```typescript
interface ReviewResult {
  decision: 'approve' | 'revise' | 'reject';
  score: number;  // 0-100
  
  // 评分维度
  scores: {
    roi: number;         // 0-25
    userValue: number;   // 0-25
    executable: number;  // 0-25
    aiPotential: number; // 0-25
  };
  
  // State 质量评估
  stateQuality: {
    completeness: number;    // 0-1
    consistency: number;     // 0-1
    actionability: number;   // 0-1
  };
  
  // 阻塞项
  blockers: string[];
  
  // 修复建议
  suggestions: string[];
}
```

### 7.1 决策规则

| 条件 | 决策 | 下一步 |
|------|------|--------|
| score >= 80 && blockers = [] | approve | presentation |
| 60 <= score < 80 | revise | synthesis (修改 PRD) |
| score < 60 | reject | business (重新分析) |
| blocker_level = 'high' | reject | business |

---

## 8. Memory Evolution

记忆不是存储结果，而是记录**State 演化路径**：

```typescript
interface EvolutionEntry {
  timestamp: string;
  fromState: string;    // state hash
  toState: string;      // state hash
  node: string;         // 执行节点
  routing: string;      // 路由决策
  hermesChanges: string[];  // Hermes 修改
}

interface FailurePattern {
  pattern: string;      // 如 "missing_user_context → review fail"
  fix: string;          // 如 "add user_node pre-check"
  successRateBefore: number;
  successRateAfter: number;
  occurrences: number;
}
```

---

## 9. 验收标准

### 9.1 Schema 验收 (T2)

- [ ] `WorkflowState` 支持所有节点字段
- [ ] `meta` 包含置信度/缺失字段/尝试次数
- [ ] `ReviewResult` 包含 stateQuality 评估
- [ ] `EvolutionEntry` 可记录完整路径

### 9.2 Runtime 验收 (T3)

- [ ] 节点可并行执行
- [ ] 支持动态回跳 (fallback)
- [ ] Hermes 只做增强，不控流程
- [ ] Review 可阻塞/放行/返工

### 9.3 Stage Execution 验收 (T4)

- [ ] `capability` 分层：text / review / multimodal
- [ ] `tool` 插槽：可注册外部工具
- [ ] `skill` 插槽：可注册预定义技能

### 9.4 Memory 验收 (T5)

- [ ] 任一 run 可追溯完整 state 路径
- [ ] 可查看 Hermes 修改记录
- [ ] 可查看 routing history
- [ ] 可查询 failure patterns

---

## 10. 本轮明确不做

- [ ] 全量迁移到 FastAPI
- [ ] 全量迁移到 Next.js
- [ ] 真接 Postgres / Redis / Vector DB
- [ ] 真接 LangGraph 并整体替换现有执行链路
- [ ] 把所有子项目一起升级

**本轮只做**：接入边界、适配点、后续迁移位。

---

## 11. 版本对比

| 版本 | 本质 | 执行结构 | 控制方式 | Hermes 角色 |
|------|------|----------|----------|-------------|
| v0.2 | 骨架系统 | 线性流程 | 阶段推进 | 无 |
| v0.3 | State Graph OS | 图结构 | 状态转移 | 语义增强层 |
| v0.4+ | 平台化 | 分布式 | 事件驱动 | 全局认知层 |

---

**文档版本**: v0.3.0  
**创建日期**: 2026-04-14  
**状态**: 草稿 → 待评审 → 已确认
