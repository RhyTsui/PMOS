# 智投 Chat UI 验收会话沉淀 2026-05-26

本文件记录本次会话后半段围绕智投 Chat UI 验收继续处理的事项，便于关闭会话后恢复上下文。

## 1. 背景统一与底部提示文案

用户反馈：
- 会话区和顶部栏仍是两个背景色。
- 底部也出现明显白底。
- inbox 截图 `photo_2026-05-26_14-04-04.jpg` 标出了上下白色背景。

修改点：
- 新增统一背景常量 `CHAT_WORKSPACE_BACKGROUND`。
- 将聊天主区域、空态区域、底部输入区放到同一父容器背景上。
- `.xiaoqiao-empty-stage` 与 `.xiaoqiao-composer-area` 在统一背景容器内改为透明，避免上下白色块。
- 底部提示文案全局改为：`保护用户隐私和公司数据是员工责任，禁止向无权限者提供敏感信息。`

相关文件：
- `frontend/src/src/app/page.tsx`
- `frontend/src/src/app/globals.css`
- `frontend/src/src/components/cognitive/InputArea.tsx`

验证：
- `node tmp/check-empty-chat-bg.cjs`
- `node tmp/check-chat-bg-and-footer-copy.cjs`
- `npm.cmd run build`

截图：
- `docs/review/empty-chat-unified-bg-desktop.png`
- `docs/review/empty-chat-unified-bg-mobile.png`
- `docs/review/chat-bg-footer-copy-desktop.png`
- `docs/review/chat-bg-footer-copy-mobile.png`

## 2. 右侧栏与底部输入区分割弱化

用户反馈：
- 右侧侧边栏和会话区有明显分割。
- 左侧会话区和底部有明显分割。

修改点：
- 右侧结果面板、来源面板、需求面板、活动面板移除外层白底和 `borderLeft`。
- 右侧面板 header 移除底部分割线，背景改为透明。
- 底部输入区外层保持透明。
- 输入框主卡片阴影减弱，避免形成明显横向白色区域。

相关文件：
- `frontend/src/src/app/page.tsx`
- `frontend/src/src/components/cognitive/InputArea.tsx`

验证：
- `node tmp/check-panel-bottom-seams.cjs`
- `node tmp/check-empty-chat-bg.cjs`
- `npm.cmd run build`

截图：
- `docs/review/right-panel-bottom-seams-desktop.png`

## 3. 空态欢迎区矩形色块边界

用户反馈：
- inbox 截图 `photo_2026-05-26_15-26-11.jpg` 中，推荐卡片右侧有竖向色块，底部输入区上方有横向色块。

定位结论：
- 不是右侧真实侧栏问题。
- 根因是 `.xiaoqiao-empty-content-shell::before` 使用固定宽高的半透明白色矩形光层，边界刚好露在推荐卡片右侧和底部区域。

修改点：
- 将固定矩形白色光层改成更大范围的径向散射光。
- 去除该伪层的硬 `mask-image` 边界。
- 保留空态欢迎区的柔和高光，不再出现矩形白块边缘。

相关文件：
- `frontend/src/src/app/globals.css`

验证：
- `node tmp/check-empty-chat-bg.cjs`
- `node tmp/check-panel-bottom-seams.cjs`
- `npm.cmd run build`

截图：
- `docs/review/empty-chat-unified-bg-desktop.png`
- `docs/review/empty-chat-unified-bg-mobile.png`

## 4. 历史会话 AG Grid 主题报错

用户反馈：
- 查看历史会话时报前端错误。
- 控制台错误：AG Grid error #239，提示 Theming API 和 CSS File Themes 同页混用。

定位结论：
- 历史会话中包含表格或数据可视化消息时会动态加载 `DataVizRenderer`。
- `DataVizRenderer` 引入了 `ag-grid.css` 和 `ag-theme-quartz.css` 旧 CSS 主题文件。
- AG Grid v35 默认使用新 Theming API；未传 `theme` 时默认 `themeQuartz`，因此和旧 CSS 文件冲突。
- 复现脚本还发现 Next dev inspector 会向 JSX 组件注入 `data-inspector-*`，AG Grid 会把这些未知 props 当作非法 gridOptions 警告。

修改点：
- 保留现有旧 CSS 主题，不迁移整体 AG Grid 视觉。
- 给 `AgGridReact` 显式设置 `theme: 'legacy'`。
- 将 JSX `<AgGridReact />` 改为 `createElement(AgGridReact, ...)`，避免 dev inspector 注入 `data-inspector-*` 到 AG Grid props。

相关文件：
- `frontend/src/src/components/cognitive/DataVizRenderer.tsx`

新增验证脚本：
- `tmp/check-history-ag-grid-theme.cjs`

验证：
- `node tmp/check-history-ag-grid-theme.cjs`
  - 8002 打开历史会话表格结果。
  - `.ag-root` 正常渲染。
  - console 无 AG Grid #239。
  - console 无 AG Grid `data-inspector-*` 非法 gridOptions warning。
- `npm.cmd run build`

截图：
- `docs/review/history-ag-grid-theme-desktop.png`

## 5. 关键验证脚本索引

```bash
node tmp/check-empty-chat-bg.cjs
node tmp/check-chat-bg-and-footer-copy.cjs
node tmp/check-panel-bottom-seams.cjs
node tmp/check-history-ag-grid-theme.cjs
npm.cmd run build
```

说明：
- 本轮遵守端口约束，浏览器检查均基于 `http://127.0.0.1:8002`。
- `ad` 包当前没有 `ts-check` script，直接执行 `npm.cmd run ts-check` 会提示 missing script；最终以 `npm.cmd run build` 的前后端构建结果为准。
- 当前工作区仍有大量历史改动和截图产物，本文件只覆盖本轮已经确认并验证过的修改点。

## 6. 已完成状态

- 背景统一：已处理，浏览器脚本通过。
- 右侧栏与底部分割：已处理，浏览器脚本通过。
- 空态矩形色块：已处理，浏览器截图确认。
- 历史会话 AG Grid 报错：已处理，历史会话表格场景浏览器验证通过。
