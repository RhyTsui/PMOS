# PMAIOS 产品方法技能化落地缺口

- version: v0.1
- date: 2026-04-27
- status: draft
- owner: product office
- purpose: 说明“产品方法要沉淀成产品经理技能”这件事为什么目前没有真正落地，以及下一步应该怎么补

## 1. 先给结论

这件事目前没有真正落地。

不是完全没做，而是只做到了第一层：

- 有少量方法被登记进 `skills/registry.json`
- 有少量方法被 prompt 间接引用
- 有少量方法能被 Product Chief 作为匹配项推荐

但还没做到第二层和第三层：

- 没有形成完整的产品方法技能矩阵
- 没有形成“方法 skill -> 触发条件 -> 输出模板 -> 产物契约 -> 工作流接入”的闭环

所以当前状态判断应是：

- “方法已被提到”：`solved`
- “方法已被 skill 化登记”：`partial`
- “方法已成为真实可执行 PM 能力”：`unsolved`

---

## 2. 当前已经落地了什么

根据现有 `skills/registry.json`，和“产品方法”直接相关的，主要只有下面这些：

1. `persona`
2. `five-w-two-h`
3. `competitive-analysis`
4. `system-boundary`
5. `task-breakdown`
6. `schema-driven-ui-design`

这说明系统已经有“方法入口”的意识，但只覆盖了很少一部分，而且多半还是宽泛技能，不是完整方法体系。

---

## 3. 为什么说它没有真正落地

## 3.1 技能注册不等于方法落地

现在更多是：

- 在 registry 里登记了 skill 名称
- 给了 `triggerKeywords`
- 给了一个 `promptPath`

但这还只是“有标签”。

真正的方法技能化，至少还应该包含：

1. 适用问题类型
2. 不适用边界
3. 输入契约
4. 输出契约
5. 关联模板
6. 在什么阶段自动触发
7. 和其他方法之间如何串联

当前这些都不完整。

## 3.2 方法没有形成产品经理方法库

现在 registry 更像一组分散 skill，而不是“产品经理方法库”。

缺的不是再加几个名字，而是缺：

- 方法分类
- 方法层级
- 方法选用规则
- 方法之间的组合关系

换句话说，现在系统知道 `5W2H` 是一个 skill，但不知道：

- 它应该在什么问题下优先于 `persona`
- 它和 `JTBD` 的关系是什么
- 它应该在产品定位阶段使用，还是在需求收敛阶段使用
- 它的输出应进入什么真源文档

## 3.3 方法没有接到产物链上

真正落地的方法技能，不该只出现在 skill 名称里，而应该进入产物链：

例如：

- `5W2H` 输出应该进入 `产品定义` 或 `PRD baseline`
- `Persona` 输出应该进入 `用户画像资产`
- `RICE` 输出应该进入 `优先级评估卡`
- `Kano` 输出应该进入 `需求分层判断`
- `North Star Metric` 输出应该进入 `价值指标定义`

现在大多数方法没有自己明确的产物挂点，所以即使“被用了”，也很难沉淀成系统资产。

## 3.4 方法没有接到工作流路由上

现在方法更多靠：

- brief 关键词匹配
- prompt 中的隐式约束
- 少量 Product Chief 推荐

但没有形成真正的路由规则：

- 什么问题先走 `产品定义方法`
- 什么问题先走 `用户研究方法`
- 什么问题先走 `优先级决策方法`
- 什么问题先走 `价值评估方法`

这会导致方法很容易停留在“文档里提过”，而不是“运行时真的会用”。

---

## 4. 当前缺口到底卡在哪

这件事没落地，不是单点问题，而是卡在四层：

## 4.1 方法目录层没建完

现在没有一份完整的“产品方法技能清单”。

至少缺这些大类：

- 产品定义类
- 用户研究类
- 需求决策类
- 优先级类
- 价值与指标类
- 竞争与市场类
- 方案拆解类
- 交付协同类
- 复盘迭代类

## 4.2 方法 schema 层没统一

每个方法 skill 至少应统一描述：

- method id
- method name
- method category
- solves what problem
- use when
- do not use when
- input fields
- output fields
- linked template
- linked stage
- linked follow-up method

现在这套 schema 不存在。

## 4.3 方法 prompt 层没分离

现在很多方法仍然挤在：

- `prompts/prd_prompt.md`
- `prompts/task_prompt.md`
- `prompts/architecture_prompt.md`

这意味着：

- prompt 是阶段型的
- 不是方法型的

所以它最多支持“这个阶段顺便用一下方法”，不支持“把方法本身作为独立能力复用”。

## 4.4 方法产物层没治理

没有配套模板时，方法很容易变成：

- 一段分析话术
- 一次聊天展开
- 一次临时结果

而不会长成：

- 方法卡
- 标准化分析结果
- 版本化产物
- 后续可引用资产

---

## 5. 该怎么定义“真正落地”

真正落地，不是把 20 个方法写进 registry。

真正落地的判断标准应该是：

1. 有方法清单
2. 有方法分类
3. 每个方法有独立定义
4. 每个方法有输入输出契约
5. 每个方法有模板
6. 每个方法能进入 workflow / Product Chief 路由
7. 方法结果能沉淀成正式产物

只满足前 1 到 2 条，不算落地。
至少走到第 6 条，才算系统级落地。

---

## 6. 建议的产品方法技能矩阵

建议下一步不是继续随手补方法，而是先建立矩阵。

### 6.1 产品定义类

- 5W2H
- Value Proposition Canvas
- Problem Statement
- Vision Narrative
- Business Boundary

### 6.2 用户研究类

- Persona
- JTBD
- Stakeholder Map
- User Scenario
- Pain / Gain Map

### 6.3 需求决策类

- Kano
- Requirement Layering
- Must / Should / Could
- Acceptance Criteria Framing

### 6.4 优先级类

- RICE
- Impact / Effort
- Cost Of Delay
- Release Scope Cut

### 6.5 价值与指标类

- North Star Metric
- HEART
- AARRR
- Success Metric Tree

### 6.6 市场与竞争类

- Competitive Analysis
- Build / Buy / Adapt / Watch
- Strategic Radar

### 6.7 方案与架构协同类

- System Boundary
- Capability Map
- Workflow Contract
- Schema-Driven UI Design

### 6.8 复盘与迭代类

- Retrospective
- Decision Change Record
- Risk Burn-down
- Learning Upgrade Memo

---

## 7. 正确的落地顺序

建议按四步走：

## Step 1. 建方法母表

先定义产品方法总表，而不是先改 prompt。

产物建议：

- `product-method-registry.json`
- `product-method-taxonomy.md`

## Step 2. 建方法卡

每个方法单独成卡，说明：

- 解决什么问题
- 在什么场景用
- 输入输出是什么
- 接到哪个模板

## Step 3. 建方法 prompt 和模板

每个方法至少需要：

- 独立方法 prompt
- 对应产物模板
- 与工作流 stage 的映射

## Step 4. 接 Product Chief 路由

让系统不只是“知道这个方法存在”，而是能：

- 自动推荐
- 自动组合
- 自动生成对应产物

---

## 8. 当前最关键的判断

你问“之前不是说都要沉淀成产品经理技能嘛，怎么没落地”，核心答案是：

因为当前系统只完成了“把少数方法登记成 skill 名称”，没有完成“把方法建设成受治理、可执行、可路由、可沉淀的产品能力体系”。

也就是说，问题不在于没提方法，而在于：

`方法目录化做了一点，方法系统化还没做。`

---

## 9. 接下来的正确动作

下一步不应该再泛泛谈方法，而是直接做下面三件事：

1. 建 `PMAIOS 产品方法总表`
2. 建第一批方法卡
3. 让 Product Chief 能真正路由这些方法

如果这三步不做，后面再提更多方法名，也还是停留在“说过”，而不是“落地”。
