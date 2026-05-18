# 外部设计 Skill 二轮评估与吸收提案

- version: v0.1
- date: 2026-05-06
- status: active
- purpose: 把外部设计 skill / 设计语料资源拆成可吸收能力，并映射为 PMAIOS 应新增的 design skill、schema、gate 与模板

## 1. 本轮评估对象

1. `google-labs-code/stitch-skills`
2. `VoltAgent/awesome-design-md`
3. `skillhub.cn/skills/product-design-gungun`
4. `nextlevelbuilder/ui-ux-pro-max-skill`

## 2. 核心判断

这 4 个对象不是同一种东西：

1. `stitch-skills` 更像设计工作流 skill 库。
2. `awesome-design-md` 更像设计语言语料库。
3. `product-design-gungun` 当前证据不足，不能当作稳定输入。
4. `ui-ux-pro-max-skill` 更像大而全的设计 intelligence 包。

因此 PMAIOS 不应做“整包安装选型”，而应做“能力拆分吸收”。

## 3. 单项评估

### 3.1 `stitch-skills`

来源显示它是一个围绕 Stitch MCP 的 skill 库，包含：

- `stitch-design`
- `stitch-loop`
- `design-md`
- `enhance-prompt`
- `react-components`
- `remotion`
- `shadcn-ui`

并且仓库明确采用标准结构：

- `SKILL.md`
- `scripts/`
- `resources/`
- `examples/`

#### 可吸收能力

1. 设计 skill 的标准目录结构
2. `design-md` 这种“把设计系统写成自然语言真源”的能力
3. `enhance-prompt` 这种“把模糊 UI 想法增强为结构化设计输入”的能力
4. `react-components` 这种“设计到 React 组件承接”的能力
5. `scripts/resources/examples` 三层支撑，而不是只有 prompt 正文

#### 不建议直接照搬的部分

1. `stitch-loop`
   - 太依赖 Stitch 的单提示多页生成逻辑
   - 和 PMAIOS 当前强调的确认链、回写链、结构化承接链不完全一致
2. Stitch MCP 绑定
   - 如果平台不把 Stitch 作为默认长期主链，整套原生依赖会形成路径锁定

#### 对 PMAIOS 的启发

最值得吸收的是“技能结构”和“设计真源文档化”，不是具体生成器绑定。

### 3.2 `awesome-design-md`

来源说明它是 `DESIGN.md` 的集合，定位非常明确：

- 把 `DESIGN.md` 放到项目根目录
- 让 AI agent 读这个文件
- 按指定设计语言生成 UI

它解决的是“设计语言如何让 agent 读懂”，而不是“设计治理如何成立”。

#### 可吸收能力

1. `DESIGN.md` 作为自然语言设计系统真源
2. 将品牌/产品视觉语言抽成 agent 可读的文本规范
3. 设计风格样本库和参考库
4. `AGENTS.md` 管构建，`DESIGN.md` 管视觉语言，这种双真源分工

#### 不建议直接照搬的部分

1. 大量品牌风格直接复用
   - 会把 PMAIOS 引向“像某品牌”，而不是“适合当前项目”
2. 只靠 `DESIGN.md` 做最终交付
   - 对 PMAIOS 来说，`DESIGN.md` 只能是设计语言层，不够承担确认链与实现承接链

#### 对 PMAIOS 的启发

最值得吸收的是：把 `DESIGN.md` 变成平台级正式对象，而不是把这个仓库当执行 skill。

### 3.3 `product-design-gungun`

当前无法拿到 skill 正文，只能拿到站点异常或无关搜索结果。

#### 当前判断

1. 不能高置信评估其输入输出
2. 不能确认它是方法论 skill、UI 设计 skill，还是个人经验包
3. 不能确认它是否有脚本、模板、示例、依赖说明

#### 平台处理建议

1. 当前标记为 `blocked / evidence-missing`
2. 不进入正式选型
3. 如后续拿到正文，再补一次独立评估

### 3.4 `ui-ux-pro-max-skill`

来源显示它提供：

- Design System Generator
- 161 条行业推理规则
- 67 种 UI style
- 161 套配色
- 57 组字体搭配
- 99 条 UX guideline
- 15 类 stack 支持

并且支持自己的 CLI 安装链与多 agent 平台分发。

#### 可吸收能力

1. “行业 -> 风格 -> 配色 -> 字体 -> 交互禁项 -> 交付检查项”的推理结构
2. 设计系统生成器输出形态
3. `anti-pattern` 显式建模
4. 交付前 checklist 显式建模
5. stack-aware 的实现建议层

#### 不建议直接照搬的部分

1. 整包安装
   - 太大、太重、太自成体系
2. 它自己的 CLI / 安装分发体系
   - 会和 PMAIOS 当前 skill / 文档 / 治理链打架
3. 让它成为默认主 design skill
   - 会把平台带回“黑箱 design intelligence”，而不是“可治理设计链”

#### 对 PMAIOS 的启发

最值得吸收的是“规则库 + 反模式 + 预交付检查项”的结构，不是它的整包执行方式。

## 4. 能力拆分结果

### 4.1 应新增到 PMAIOS 的 design skill

#### A. `design-language-md`

来源吸收：

- `stitch-skills/design-md`
- `awesome-design-md`

职责：

- 生成或更新项目级 `DESIGN.md`
- 用自然语言沉淀视觉语言、语气、组件偏好、布局节奏、禁项
- 只负责“设计语言真源”，不负责最终 UI 交付

#### B. `design-prompt-refiner`

来源吸收：

- `stitch-skills/enhance-prompt`
- `ui-ux-pro-max-skill` 的风格/行业/反模式推理

职责：

- 把模糊设计想法转成结构化设计输入
- 自动补齐行业风格建议、反模式、约束项、目标页面类型
- 输出给 `html-direction-pack` 或视觉稿链使用

#### C. `design-to-component-handoff`

来源吸收：

- `stitch-skills/react-components`
- `ui-ux-pro-max-skill` 的 stack-aware 映射

职责：

- 从设计承接稿 / `ui-schema-spec` / `DESIGN.md` 生成组件映射
- 明确当前页面应落到哪个组件体系，如 `YokaUI`
- 输出组件级 handoff，而不是泛泛的“像图实现”

#### D. `design-anti-pattern-review`

来源吸收：

- `ui-ux-pro-max-skill` 的 anti-pattern 和 pre-delivery checklist

职责：

- 在视觉稿、静态 HTML、实现前检查常见禁项
- 例如：错误行业风格、过量解释性文案、对比度不足、交互态缺失、组件语义漂移

### 4.2 应新增到 PMAIOS 的 schema / 对象

#### A. `DESIGN.md`

定位：

- 项目级设计语言真源

正式定义入口：

- `docs/operations/design-language-object-and-skill.md`

字段建议：

- design intent
- brand / tone
- page family
- visual hierarchy
- typography rules
- color system
- surface / spacing / radius / shadow rules
- component semantics
- anti-patterns
- confirmation notes

#### B. `design-system-profile.json`

定位：

- 机器可读设计系统摘要

来源吸收：

- `ui-ux-pro-max-skill` 的设计系统生成器

字段建议：

- industry type
- recommended style family
- palette family
- font pairing
- interaction effects
- accessibility target
- avoid rules
- preferred component family

#### C. `design-confirmation-record`

定位：

- 设计确认链的机器可读记录

正式定义入口：

- `docs/operations/confirmation-chain-object-and-gate.md`

字段建议：

- object id
- layer
- confirmer role
- status
- confirmed at
- unblock target
- supersedes

#### D. `design-anti-pattern-checklist`

定位：

- 预交付检查对象

字段建议：

- category
- rule
- severity
- evidence
- status

### 4.3 应新增到 PMAIOS 的 gate

#### A. `design-language-ready gate`

通过条件：

- 有 `DESIGN.md`
- 有项目级设计禁项
- 有组件体系偏好

阻止：

- 没有设计语言真源就直接出高保真或落前端

正式定义入口：

- `docs/operations/design-language-object-and-skill.md`

#### B. `design-confirmed gate`

通过条件：

- 原型、交互、视觉 UI、静态 HTML 的确认状态已记录

阻止：

- 把“已生成”误当“已确认”

#### C. `component-semantics-aligned gate`

通过条件：

- 设计承接稿和目标组件体系映射已存在

阻止：

- 设计稿和前端实现各说各话

#### D. `anti-pattern-cleared gate`

通过条件：

- 行业反模式、文案禁项、可访问性和关键交互检查已过

阻止：

- 带明显设计错误进入实现或交付

## 5. 不建议引入的平台动作

1. 不整包引入 `ui-ux-pro-max-skill`
2. 不把 `awesome-design-md` 当默认执行 skill
3. 不把 Stitch MCP 绑定写进平台主链
4. 不在证据不足时引入 `product-design-gungun`

## 6. 推荐落地顺序

### 第一阶段：轻量吸收

1. 新增 `DESIGN.md` 平台对象定义
2. 新增 `design-language-md` skill
3. 新增 `design-confirmation-record` 与确认 gate

### 第二阶段：承接增强

1. 新增 `design-prompt-refiner`
2. 新增 `design-to-component-handoff`
3. 把 `YokaUI` 映射要求接到 handoff 链

### 第三阶段：治理加强

1. 新增 `design-anti-pattern-review`
2. 新增 `design-system-profile.json`
3. 新增 `anti-pattern-cleared gate`

## 7. 本轮建议结论

PMAIOS 当前不应做“选一个外部设计 skill 当主 skill”的决策。

更合理的路线是：

1. 吸收 `stitch-skills` 的 skill 结构与设计文档化能力
2. 吸收 `awesome-design-md` 的 `DESIGN.md` 设计语言真源思路
3. 吸收 `ui-ux-pro-max-skill` 的设计系统生成、反模式和预交付检查结构
4. 将它们转写为 PMAIOS 自己的 design skill、schema 与 gate
5. `product-design-gungun` 等待正文证据后再决策

## 8. 用户诉求回查

- 用户诉求：做第二轮，不停在泛评估
  - 结果：`solved`
  - 说明：已从单点评估推进到能力拆分、平台吸收对象、gate、schema 与落地顺序。

- 用户诉求：为 PMAIOS 提供可执行方向
  - 结果：`partial`
  - 说明：路线已给出，但还没正式落成平台 skill / schema 文件与运行规则。
