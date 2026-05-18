# Multi-PM Group Session Spec

- version: v0.2
- date: 2026-04-30
- status: active
- owner: product office

## Purpose

这份文档定义 `multi-pm group session` 的规格和约束。

它要解决的不是“多个 PM 轮流说话”，而是：

- 用户希望多个虚拟产品经理围绕一个明确交付目标协作
- PMA 说过的话，PMB 能够承接、补充、质疑和推进
- 讨论不是停在意见层，而是持续收敛到需求、设计、版本和交付真源

一句话定义：

`multi-pm group session = 围绕单一交付目标运行的、多 PM 自主对话与收敛协作协议`

## Core Principle

群会话的主轴不是“话题”，而是：

`delivery target`

也就是：

- 这次到底要交付什么
- 当前离交付还差什么
- 哪些结论必须被沉淀为真源

因此群会话应始终围绕：

1. 交付目标
2. 当前差距
3. 冲突与阻塞
4. 下一安全步

而不是围绕“多说几轮意见”。

## Scope

本规格用于：

- 需求澄清与冻结
- 设计交付链收敛
- 版本边界与优先级判断
- 实现承接与 proof-of-work 对齐
- 复杂分歧的定向收敛

本规格不用于：

- 通用闲聊
- 没有交付目标的开放讨论
- 纯展示型群聊界面
- 让多个 PM 各自给一份独立答案

## Position In PMAIOS

`multi-pm group session` 是高层协作协议，不是底层 review 对象。

它建立在这些能力之上：

- `Task SSOT`
- `Project Continuation Runtime`
- `Gate Runtime`
- `Hermes`
- `review committee`

边界必须明确：

- `multi-pm group session` 负责围绕交付目标进行自主对话、冲突收敛、真源回写
- `review committee` 负责评审与门禁
- `Hermes` 负责提供比较与外部参考
- `Continuation Runtime` 负责确保讨论结束后还能继续推进

## Core Objects

一个群会话最小需要这些对象：

1. `session`
   - 会话容器
   - 对应一个交付目标

2. `deliveryTarget`
   - 这轮会话服务的交付物或交付结果
   - 例如：
     - 一份功能规格
     - 一组 `delivery-html + schema-delivery`
     - 一个版本是否纳入某能力的结论

3. `chair`
   - 主持人 / chief PM
   - 负责控方向、判停点、做最终收口

4. `participants`
   - 多个 PM 角色
   - 按职责分工，不允许同质化堆叠

5. `agenda`
   - 围绕交付目标必须解决的子问题

6. `messages`
   - 自主对话消息流

7. `conflicts`
   - 冲突记录

8. `convergence`
   - 当前收敛状态

9. `backwriteTargets`
   - 需要回写的真源位置

10. `nextSafeStep`
   - 本轮结束后下一安全步

## Supported Roles

默认推荐角色集：

1. `chief-pm`
   - 主持与收口

2. `requirements-pm`
   - 关注用户需求、业务范围、验收口径

3. `design-pm`
   - 关注信息架构、交互、设计承接

4. `delivery-pm`
   - 关注实现承接、交付结构、proof-of-work

5. `version-pm`
   - 关注优先级、进入哪个版本、是否应该推进

可选角色：

- `risk-pm`
- `ops-pm`
- `data-pm`
- `integration-pm`

规则：

- 默认不超过 `5` 个主要 PM 参与者
- 每个参与者必须有清晰职责
- 没有职责差异的重复 PM 不应加入

## Session Contract

每个群会话必须显式包含：

- `sessionGoal`
- `deliveryTarget`
- `currentGap`
- `chairRole`
- `participantList`
- `expectedOutputs`
- `stopCondition`
- `backwritePolicy`

最小示例：

- 目标：把 tracking-acceptance 的埋点需求页推进到可交付前端页面
- 交付目标：`delivery-html + schema-delivery`
- 当前差距：HTML 质量低，schema 与页面未强绑定
- 参与者：chief-pm / requirements-pm / design-pm / delivery-pm
- 预期输出：交付标准、约束、回写目标、下一安全步

## Autonomous Dialogue Rule

群会话必须支持：

- `user -> PMA`
- `PMA -> PMB`
- `PMB -> PMC`
- `chair -> all`

也就是说：

`PMA 回复的消息，PMB 必须能够承接并回应。`

这里的关键不是“接力发言”，而是：

- 能补充
- 能质疑
- 能修正
- 能推进
- 能收敛

所以它是：

`autonomous dialogue`

而不是：

`轮流发言，等用户反馈，再来一轮`

## Message Protocol

每条消息至少要有：

- `messageId`
- `speakerId`
- `speakerRole`
- `replyToMessageId`
- `deliveryTargetRef`
- `stance`
- `intent`
- `summary`

其中：

- `replyToMessageId`
  - 用来表达 PMA 的话被 PMB 承接

- `stance`
  - 支持：
    - `support`
    - `concern`
    - `blocker`
    - `clarify`
    - `proposal`
    - `decision`

- `intent`
  - 支持：
    - `extend`
    - `challenge`
    - `correct`
    - `converge`
    - `request-evidence`
    - `backwrite`

目的很明确：

- 让 PM 之间真正形成可追踪对话链
- 不是多个并列独白

## Conversation Flow

默认流程不再是固定 roundtable，而是交付驱动的 threaded 协作：

1. `chair` 宣布交付目标
2. 某个 PM 先提出主判断
3. 其他 PM 直接承接前一条消息继续推进
4. 出现冲突时，进入冲突收敛分支
5. `chair` 在足够证据后做收口
6. 把结论回写真源，并留下下一安全步

重点：

- 不要求每个 PM 都必须说一轮
- 不要求每轮都等用户插话
- 允许 PM 之间连续自主对话
- 但每条对话都必须服务于当前交付目标

## Delivery-Driven Constraint

每条 PM 消息都必须至少回答下面之一：

1. 这条信息如何推进交付目标
2. 这条信息暴露了什么交付风险
3. 这条信息要求改动哪个真源
4. 这条信息决定了什么下一步

如果一条消息不推进这四类内容，它就不该进入主链。

## Conflict Handling

冲突必须结构化记录，而不是散落在长对话里。

每个冲突最少记录：

- `conflictId`
- `deliveryTargetRef`
- `topic`
- `positionA`
- `positionB`
- `whyConflicting`
- `resolutionOwner`
- `status`

状态支持：

- `resolved`
- `needs-human-decision`
- `blocked`
- `parked`

## Convergence Rule

允许的收敛结果只有三类：

1. `converged`
   - 已形成统一交付判断

2. `needs-human-decision`
   - 分歧保留给用户拍板

3. `blocked`
   - 缺关键信息，无法继续推进

不允许伪收敛：

- 只是聊了很多
- 没有结论状态
- 没有回写目标
- 没有下一安全步

## Backwrite Rule

群会话结论必须回写，不能停在聊天流里。

至少回写到这些目标之一：

1. `requirements`
2. `design`
3. `version`
4. `delivery`
5. `implementation-handoff`

每次回写至少记录：

- `targetType`
- `targetPath`
- `changeSummary`
- `sourceSessionId`
- `sourceMessageIds`

## Product Constraints

为了让这项能力真正可落地，产品层必须满足这些约束：

1. 用户必须能看出谁在说话
2. 用户必须能看出 PMB 正在回应 PMA 的哪条消息
3. 用户必须能看出当前会话服务的交付目标是什么
4. 用户必须能看出当前讨论是推进、冲突还是收口
5. 用户必须能看出最终哪些真源被改写
6. 用户必须能看出会话结束后的下一安全步

因此产品层默认规则应是：

- 主交付目标置顶
- reply 链清晰可见
- 主持人结论单独高亮
- 回写结果可见
- side thread 默认折叠或 parked

## Governance Constraints

以下约束必须成立：

1. 一个会话只服务一个主交付目标
2. 每个 PM 必须有职责
3. 任意 PM 消息都必须挂到当前交付目标
4. agent-to-agent 接话必须有 reply 链
5. 主持人必须存在
6. side topic 默认 parked，不劫持主链
7. 没有真结论时不能伪装成完成
8. 没有回写目标时不能声称收敛
9. 会话结束后必须留下 `nextSafeStep`

## Not Allowed

以下做法不允许：

1. 多个 PM 各自输出独立答案，不互相承接
2. PMA 说完后，PMB 另起炉灶，不接上下文
3. 每说一轮就停下来等用户再反馈
4. 没有交付目标，只围绕泛泛话题讨论
5. 讨论完不回写真源
6. 把 review committee 和群会话混成一个对象
7. 自主对话无限分叉，最后没有主结论

## Relation To Existing Runtime

与现有运行时的关系：

- `Task SSOT`
  - 群会话必须挂到明确 task / mainline / delivery target

- `Project Continuation Runtime`
  - 群会话结束后必须留下 `nextSafeStep`

- `Gate Runtime`
  - 当结论为 `blocked` 或 `needs-human-decision` 时，应进入 gate 状态

- `Hermes`
  - Hermes 可提供候选方案和外部参考
  - 但不替代 PM 之间的自主对话

- `review committee`
  - 群会话先形成交付收敛
  - committee 再做评审门禁

## Minimum v0.7 Scope

`v0.7` 的最小目标不是实时群聊产品，而是最小可用的交付驱动协作线程：

1. 支持多个 PM 围绕一个交付目标持续对话
2. 支持 `PMA -> PMB -> chair` 的承接链
3. 支持冲突记录
4. 支持结论状态
5. 支持回写真源
6. 支持 `nextSafeStep`

## Exit Standard

若要认为最小版可用，至少要满足：

1. 用户能看到明确交付目标
2. PMA 的消息能被 PMB 明确承接
3. 对话不会在每轮后停下来等用户反馈
4. 冲突点不会丢
5. 会话能收敛为明确状态
6. 结论能回写真源
7. 会话结束后有下一安全步

## User-Requirement Backcheck

原始用户需求不是“多几个 agent”，而是：

- 多个产品经理能在一个群会话里围绕交付目标协作
- PMA 说的话 PMB 能接住回应
- 对话是自主推进的，不是每轮等用户确认

回扣判断：

- 交付驱动主语已明确：`solved`
- PM 之间的自主承接协议已明确：`solved`
- 真正产品化成实时群聊界面：`partial`

## Final Conclusion

`multi-pm group session` 的核心不是“多人发言”，而是：

`多个 PM 围绕一个交付目标自主对话、互相承接、持续收敛，并把结论回写到平台真源。`
