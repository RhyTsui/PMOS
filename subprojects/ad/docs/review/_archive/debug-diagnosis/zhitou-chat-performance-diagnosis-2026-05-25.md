# 智投 Chat 性能问题诊断方案

日期：2026-05-25

## 范围

本轮只诊断，不直接修改性能实现。按当前反馈上下文归入性能项的对象：

1. 历史会话加载与默认触底体验。
2. 收藏/取消收藏后的页面闪动。
3. 任意模块点击后的加载延迟与思维链不终止的感知问题。

原始设计文档中相关条目可映射为：7「思维链不终止」、31「收藏页面存在闪动」、33「存在时间延迟」，历史会话触底属于此前已发现的加载体验链路。

## 已观察到的线索

## 可重复测量脚本

新增脚本：

- `tmp/measure-chat-performance.cjs`

脚本使用 Playwright + API mock，覆盖桌面和移动端两个视口，并跑两组场景：

- `mock-fast`：接口无额外延迟，用于测纯前端渲染/状态切换开销。
- `mock-delayed`：消息接口 350ms、收藏接口 450ms、模块接口 500ms，用于测弱网或远端接口下的感知延迟。

本脚本替代旧的 `tmp/measure-history-load.cjs` 作为当前性能基线脚本。旧脚本依赖真实种子会话写入，已观察到标题选择器与实际侧栏状态不稳定，不适合作为当前验收口径。

### 当前基线结果

运行时间：2026-05-25

| 场景 | 端 | 历史/共享消息可见 | 触底距离 | 收藏高亮 | 模块 active | 模块 ready |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| mock-fast | desktop | 330ms | 19px | 149ms | 286ms | 290ms |
| mock-fast | mobile | 548ms | 19px | 110ms | - | - |
| mock-delayed | desktop | 1009ms | 19px | 531ms | 160ms | 1000ms |
| mock-delayed | mobile | 1205ms | 19px | 545ms | - | - |

读数判断：

- 历史/共享消息可见：桌面在接口延迟 350ms 时约 1009ms，仍在 1200ms 阈值内；移动端约 1205ms，已经贴近或略超远端阈值。
- 触底距离：两端稳定为 19px，说明当前滚动策略接近底部但不是严格到底，和用户反馈“中下方，没有完全触底”一致。
- 收藏高亮：接口延迟会直接传导到图标高亮，450ms 接口延迟下高亮约 531-545ms；应优先做乐观高亮或局部 pending。
- 模块加载：内容 ready 会跟随模块接口延迟到 1000ms；需要区分“点击立即反馈”和“内容加载完成”，并补骨架/加载态。
- 思维链：本脚本注入 running process event 后未复现 active dot，说明“思维链不终止”需要用真实 SSE done 后仍有 running step 的链路再单独采样，不能仅靠静态历史消息模拟。

### 2026-05-26 局部修复复测

修复范围：

- 历史/共享会话加载后严格滚动到底部。
- 收藏/取消收藏改为乐观反馈，接口失败再回滚。

复测脚本：`tmp/measure-chat-performance.cjs`

| 场景 | 端 | 历史/共享消息可见 | 触底距离 | 收藏高亮 | 模块 active | 模块 ready |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| mock-fast | desktop | 274ms | 0px | 133ms | 312ms | 329ms |
| mock-fast | mobile | 591ms | 0px | 60ms | - | - |
| mock-delayed | desktop | 984ms | 0px | 67ms | 171ms | 1030ms |
| mock-delayed | mobile | 1345ms | 0px | 77ms | - | - |

复测判断：

- 触底问题已解决：桌面和移动端均从 19px 降为 0px。
- 收藏反馈已明显改善：延迟场景从 531-545ms 降到 67-77ms，满足 100ms 级即时反馈目标。
- 移动端共享消息可见在本轮延迟场景为 1345ms，仍需在后续“模块/共享链路加载延迟”中继续排查；本次修复没有改共享接口链路。

### 2026-05-26 加载感知优化复测

修复范围：

- 共享会话加载期间用消息骨架替代空 Chat 欢迎态，避免用户误判为空会话或回闪。
- 自动化模块 loading 从单行文案升级为结构化骨架，进入模块后先给可见反馈。
- 性能脚本新增 `sharedLoadingVisibleMs` 和 `moduleLoadingVisibleMs`。

复测脚本：`tmp/measure-chat-performance.cjs`

| 场景 | 端 | 加载态可见 | 消息/模块 ready | 触底距离 | 收藏高亮 |
| --- | --- | ---: | ---: | ---: | ---: |
| mock-fast | desktop 自动化 | - | 1598ms | - | - |
| mock-fast | mobile 共享 | 435ms | 592ms | 0px | 57ms |
| mock-delayed | desktop 自动化 | 215ms | 1045ms | - | - |
| mock-delayed | mobile 共享 | 442ms | 875ms | 0px | 73ms |

复测判断：

- 共享会话延迟场景消息可见从上一轮 1345ms 降到 875ms，且加载骨架约 442ms 出现。
- 自动化延迟场景骨架约 215ms 出现，ready 仍约 1045ms，说明当前主要等待来自接口/数据准备，但点击后已有明确反馈。
- `mock-fast` 自动化 ready 本轮有 1598ms 波动，需要后续多轮取 p50/p95，不作为单次结论。

### 历史会话加载

代码路径：

- `frontend/src/src/hooks/useConversation.ts`
  - `selectConversation` 立即清空 `messages/currentResult/callChainData`。
  - `activeConversationId` 变化后再异步 `loadMessages`。
  - 初始会话列表和发送完成后会触发 `refreshConversations`。
- `frontend/src/src/components/cognitive/ChatContainer.tsx`
  - `conversationKey` 变化后通过 `useLayoutEffect` 多次 `scrollTop = scrollHeight`。

风险判断：

- 点击历史会话时先清空消息，用户会看到空白或欢迎区回闪，属于感知延迟放大点。
- `loadMessages`、附件加载、会话列表刷新可能并行发生，弱网下会让「点击到内容出现」变长。
- 现有 `tmp/measure-history-load.cjs` 未成功拿到新建会话标题，页面实际出现了消息标题而非脚本期望标题，说明测量脚本需要先修正数据准备或选择器，否则不能作为验收口径。

建议测量：

- `history_click_to_first_message_ms`：点击历史会话到第一条消息可见。
- `history_messages_api_ms`：`/conversations/:id/messages` 接口耗时。
- `history_bottom_settle_ms`：消息可见到滚动距离底部小于 8px。
- `history_blank_duration_ms`：点击后空白/欢迎区持续时间。

验收阈值：

- 本地/Mock：首条消息可见小于 500ms。
- 远端服务：首条消息可见小于 1200ms。
- 触底稳定：消息可见后 200ms 内到底。

### 收藏闪动

代码路径：

- `frontend/src/src/components/cognitive/ChatContainer.tsx`
  - `handleToggleSaveToKnowledge` 等接口返回后才更新 `savedKnowledgeMemoryIds`。
  - `savedKnowledgeMemoryIds` 是整个 `ChatContainer` 的 state，更新会触发整个对话容器重新渲染。

风险判断：

- 当前逻辑不是乐观更新，点击后要等待接口，反馈滞后。
- state 在容器顶层，虽然 React 会 diff，但大消息列表、多 Markdown、图表和思维链同时存在时，局部收藏状态可能引发明显重绘。
- 如果接口慢或失败，用户会把等待态理解为「页面闪动或没反应」。

建议测量：

- `favorite_click_to_icon_active_ms`：点击收藏到星标高亮。
- `favorite_api_ms`：`POST /memory` 或 `DELETE /memory/:id` 耗时。
- `favorite_layout_shift`：点击收藏后的布局偏移。
- `favorite_message_surface_rerender_count`：收藏操作触发的消息渲染次数。

验收阈值：

- 图标状态反馈小于 100ms。
- 消息列表不应整体滚动、不应回到顶部、不应出现欢迎区或空白闪动。

候选修复方向：

- 先做乐观高亮和局部 pending 态，接口失败再回滚。
- 收藏状态拆到单条消息 action 层或 memo 化消息面，避免整段消息内容重绘。
- 保留知识库接口调用，不绕过真实保存/删除语义。

### 模块点击延迟 / 思维链不终止

代码路径：

- `frontend/src/src/app/page.tsx`
  - 进入自动化视图时才拉 `automation-templates`。
  - 搜索输入有 220ms debounce。
  - 共享会话同时拉 conversation 和 messages。
- `frontend/src/src/hooks/useConversation.ts`
  - SSE 完成后需要持久化 assistant 消息，然后 `refreshConversations`，最后 `setIsTyping(false)` 与 `clearConversationRunning`。
- `frontend/src/src/components/cognitive/ChatContainer.tsx`
  - `ThinkingChain` 只要存在 `loading/running/pending` step 就展示运行态动画。

风险判断：

- 模块切换如果没有即时选中态/骨架屏，用户会把接口时间理解为点击无效。
- SSE `done` 到最终 `setIsTyping(false)` 中间还有一次持久化和列表刷新，接口慢时「思维链结束感」会延后。
- 如果后端返回的 `thinking_step` 最后一项仍是 `loading/running/pending`，前端会继续显示运行态，即使内容结果已经完成。

建议测量：

- `module_click_to_active_state_ms`：点击模块到导航/按钮 active。
- `module_click_to_content_skeleton_ms`：点击模块到骨架/加载态出现。
- `module_click_to_content_ready_ms`：点击模块到内容就绪。
- `sse_done_to_typing_off_ms`：SSE done 到 `isTyping=false`。
- `thinking_last_running_after_done_count`：结果完成后仍处于 running/pending 的 step 数量。

验收阈值：

- 点击后 100ms 内必须有 active 或 pressed 反馈。
- 超过 300ms 的模块内容加载必须显示骨架或 inline loading。
- SSE done 后 200ms 内思维链应从运行态转为完成态；持久化失败不能让思维链无限运行。

## 建议执行顺序

1. 先修正测量脚本，覆盖桌面与移动：历史会话、收藏、模块切换、思维链 done。
2. 用脚本跑 3 轮取 p50/p95，确认瓶颈是接口、渲染还是状态顺序。
3. 只修一个性能点后复测，不混合 UI 风格改动。
4. 若优先修，建议顺序为：思维链终止感知 > 历史会话空白/触底 > 收藏闪动 > 模块切换骨架。

## 当前不建议直接做的事

- 不做全局缓存或全局 Suspense 改造，风险大且会影响已验收 UI。
- 不把所有接口改为并发刷新；先量化哪个接口是瓶颈。
- 不把收藏只做前端假状态；必须保留知识库保存/删除接口语义。
