# Frontend Engineering System Specification

> Canonical path: `docs/architecture/frontend-engineering/frontend-engineering-system.md`  
> Scope: 长会话、大表格、大图表、Streaming、Markdown、Artifact、状态、响应式、可观测性等工程约束

## 1. 文档定位

Frontend Engineering System 是 AI Chat OS 的工程约束层。

它不定义业务语义协议，但约束所有 renderer、chat surface、runtime timeline、data visualization 的实现方式。

## 2. 长会话窗口加载

原则：前端永远不要一次性加载完整会话历史。

推荐：

```txt
会话列表：cursor pagination
打开会话：只加载最近 40 条消息
向上滚动：before_message_id 加载更早消息
搜索跳转：around_message_id 加载上下文窗口
```

约束：

1. 会话列表接口不得返回完整 messages。
2. 前端状态只保存当前窗口消息。
3. 超过 100 条消息必须虚拟列表。
4. 搜索不能靠前端全量过滤。
5. 长历史可以使用 summary block 折叠。

## 3. 虚拟列表

适用场景：

```txt
消息列表超过 100 条
Runtime events 超过 100 条
表格行超过 200 行
Source / Evidence 列表超过 100 条
```

规则：

1. Chat 消息支持动态高度。
2. 向上加载历史时必须保持滚动锚点。
3. 图片、表格、Markdown 渲染完成后要修正高度。
4. 当前 streaming 消息要避免频繁重排。

## 4. 大表格处理

规则：

1. 大表格不直接放入 message body。
2. 大表格作为 `asset-reference` 或 `data-visualization` region。
3. 行分页、列裁剪、列虚拟化按需启用。
4. 默认只显示 preview。
5. 导出走 ActionContract。

建议阈值：

```txt
> 100 行：分页
> 200 行：行虚拟化
> 30 列：列管理 / 横向虚拟化
> 5000 单元格：Artifact-backed table
```

## 5. 大图表处理

规则：

1. 大图表懒加载。
2. 首屏只渲染关键图表。
3. 复杂图表移动端降级为摘要卡或表格预览。
4. 图表数据使用 datasetRef / artifactRef，避免塞入超大 JSON。
5. 图表联动、下钻、导出走 ActionContract。

## 6. Streaming backpressure

规则：

1. 不得每个 token 更新全局状态。
2. streaming chunk 应批处理。
3. Markdown streaming 分块解析。
4. 慢设备可降低更新频率。
5. 用户切换会话时暂停非可见区渲染。
6. 后端完成后应固化为稳定消息或 SemanticResultContract。

## 7. Markdown 分块渲染

规则：

1. 长 Markdown 分块渲染。
2. Code block、table、math、chart placeholder 独立懒渲染。
3. Markdown 内的 artifact 不内联大对象。
4. 渲染错误局部 fallback，不影响整条消息。

## 8. Artifact 懒加载

Artifact 类型：

```txt
table
chart
file
image
report
dataset
runtime-log
trace
```

规则：

1. 消息中只存 artifact_ref。
2. 点击或进入视口再加载 artifact。
3. 大 artifact 支持分页或 range fetch。
4. Artifact 权限独立校验。
5. Artifact 加载失败有 fallback。

## 9. 状态分层

推荐状态层：

```txt
Server state            API/cache/query result
Session state           当前会话窗口、当前 runtime
UI state                折叠、选中、面板开关
Streaming state         临时 chunk buffer
Persistent state        用户偏好、布局设置
Telemetry state         性能与错误观测
```

规则：

1. 不把 server state 复制到多个 store。
2. streaming buffer 不长期持久化。
3. region renderer 只拿自己的 region 和 context。
4. Runtime events 大量增长时使用窗口化状态。

## 10. 移动端降级

规则：

1. 多栏布局降级为单栏。
2. Side panel 降级为 drawer。
3. 大图表降级为摘要 + 查看详情。
4. 大表格默认显示关键列。
5. Runtime trace 默认折叠。
6. Action bar 收进 overflow menu。

## 11. 可观测性

必须采集：

```txt
contract validation error
renderer fallback
render duration
large artifact load time
streaming lag
virtual list dropped frame
runtime event count
action success / failure
permission denied
```

规则：

1. renderer fallback 必须打点。
2. Action failure 必须有 error code。
3. Runtime critical error 必须进入 observability。
4. 性能指标按 region / renderer 维度归因。

## 12. 验收清单

- [ ] 长会话不会全量加载。
- [ ] 消息、表格、runtime event 支持虚拟化。
- [ ] 大 Artifact 懒加载。
- [ ] Streaming 不导致全局频繁重渲染。
- [ ] 移动端有降级策略。
- [ ] renderer fallback 和性能有打点。

---

## v0.2 总纲一致性补充

前端工程系统必须按 ResponseContract、SemanticResultContract 与 DisclosureProjection 渲染，不从自然语言正文反推业务状态。未知 componentBinding 必须 fallback；Trace 缺失只显示观测降级，不改变业务结果。
