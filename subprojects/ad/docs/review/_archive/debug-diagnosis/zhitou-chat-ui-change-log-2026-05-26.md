# 智投Chat UI 优化修改记录

日期：2026-05-26
范围：根据 UI 反馈文档与本轮会话逐项确认后的局部优化
原则：不做全局性改动；每个问题按明确修改点落地，并做桌面端/移动端浏览器验证。

## 本轮已完成项

### 1. 我的资产列表操作按钮与删除确认

用户反馈：

- 我的资产-资产列表右侧 `...` 操作按钮没有和鼠标移入灰色背景垂直居中。
- 删除按钮需要删除确认弹窗。
- 主确认文案：`这会删除“{对应的资产名}”。`
- 无弱引导文案。

修改点：

- 资产列表单行右侧 `...` 按钮增加居中约束：`alignItems`、`justifyContent`、`justifySelf`、`alignSelf`、`padding: 0`、`lineHeight: 1`。
- 单条资产删除由直接删除改为 `Modal.confirm`。
- 弹窗标题：`删除资产`。
- 弹窗按钮：`取消`、`确认删除`。
- 删除弹窗不展示 Dataki 弱引导文案。

影响范围：

- 仅影响我的资产列表单条资产操作。
- 批量删除按钮、会话列表保存到知识库等不变。

相关文件：

- `frontend/src/src/app/page.tsx`

验证：

- 8002 Edge 桌面端：通过。
- 8002 Edge 移动端：通过。
- 操作按钮中心差值：`0`。

截图：

- `docs/review/asset-more-centered-delete-confirm-desktop.png`
- `docs/review/asset-more-centered-delete-confirm-mobile.png`

### 2. 深色浏览器小 icon 资源替换

用户反馈：

- inbox 新增 `全部返白.png`。
- 浏览器深色背景时展示的小 icon 改成这个图标。

修改点：

- 仅替换深色 scheme favicon PNG 资源，不改现有 light/dark 切换逻辑。
- `favicon-dark-scheme.png` 与 `favicon-dark.png` 替换为 inbox 的 `全部返白.png`。

影响范围：

- 仅影响浏览器深色模式下的小图标资源。
- 浅色图标、页面 logo、业务逻辑不变。

相关文件：

- `frontend/src/public/favicon-dark-scheme.png`
- `frontend/src/public/favicon-dark.png`

验证：

- 8002 Edge 深色模式桌面端：资源哈希与 inbox `全部返白.png` 一致。
- 8002 Edge 深色模式移动端：资源哈希与 inbox `全部返白.png` 一致。

### 3. 登录页左上角品牌区

用户反馈：

- inbox 里有 `无背景/横向无背景.png`。
- 登录页左上角 logo 区换成这个带文字图片。
- 去掉当前动画 icon + 文字方式。

修改点：

- 登录页品牌展示由 `Image + 小乔智投文字` 改为单张横向 logo 图片。
- 新增 public 资源：`login-logo-horizontal-clean.png`。
- 保留登录页整体布局与背景动画，不改登录流程。

影响范围：

- 仅影响登录页左上角品牌区视觉展示。

相关文件：

- `frontend/src/src/components/login/LoginValueShowcase.tsx`
- `frontend/src/src/app/globals.css`
- `frontend/src/public/login-logo-horizontal-clean.png`

验证：

- 8002 Edge 桌面端：展示 `/login-logo-horizontal-clean.png`。
- 8002 Edge 移动端：展示 `/login-logo-horizontal-clean.png`。

截图：

- `docs/review/login-logo-linkbar-desktop-dark.png`
- `docs/review/login-logo-linkbar-mobile-dark.png`

### 4. 登录框底部链接

用户反馈：

- 登录页面-登录框内，删除权限申请和帮助中心以及中间竖线。
- 改完文案：`权限申请：小闪-OA审批`。

实际落地口径：

- 按后续明确文案，保留权限申请入口。
- 隐藏帮助中心。
- 隐藏中间竖线。
- 权限申请入口文案改为：`权限申请：小闪-OA审批`。

修改点：

- 在现有登录 SDK shadow DOM 样式注入逻辑中处理，不改 SDK 源逻辑。
- `#help-link` 隐藏。
- `.divider` 隐藏。
- `#permission-link` 文案运行时改为目标文案。

影响范围：

- 仅影响登录框内底部链接展示。
- 登录方式、二维码、短信登录逻辑不变。

相关文件：

- `frontend/src/src/app/login/page.tsx`

验证：

- 8002 Edge 桌面端：帮助中心隐藏、竖线隐藏、权限文案正确。
- 8002 Edge 移动端：帮助中心隐藏、竖线隐藏、权限文案正确。

截图：

- `docs/review/login-logo-linkbar-desktop-dark.png`
- `docs/review/login-logo-linkbar-mobile-dark.png`

### 5. 折叠侧边栏左下头像弹窗可移入性

用户反馈：

- 左下角弹窗在左侧侧边栏折叠时，鼠标从用户头像移入到跟随弹窗体验很差。
- 无法有效移入弹窗，弹窗会直接关闭。

修改点：

- 为折叠态头像弹窗增加透明桥接区，覆盖头像和弹窗之间的间隙。
- 鼠标离开时增加 `180ms` 延迟关闭。
- 鼠标进入头像或弹窗时取消关闭计时。
- 点击弹窗外仍可关闭。

影响范围：

- 仅影响折叠态左下角用户头像弹窗。
- 展开态个人中心弹窗不改变。

相关文件：

- `frontend/src/src/components/workspace/TaskSidebar.tsx`

验证：

- 8002 Edge 桌面端：模拟鼠标从头像穿过间隙移动到 `我的资产`，弹窗保持打开。

截图：

- `docs/review/collapsed-profile-hover-bridge-desktop.png`

### 6. 输入框附件区蓝色提示语

用户反馈：

- 输入框中上传文件后，文件旁边出现蓝色提示语。
- 输入框内已有弱输入引导文案，不需要这个蓝色提示语。

修改点：

- 删除附件 chip 旁额外渲染的蓝色提示语。
- 保留输入框 placeholder 弱引导：`输入提示语，我会结合文件继续处理`。
- 附件 chip、删除、重试、预览行为不变。

影响范围：

- 仅影响输入框附件区的一段额外提示文案。

相关文件：

- `frontend/src/src/components/cognitive/InputArea.tsx`

验证：

- 8002 Edge 桌面端：上传/加载附件后，附件旁无蓝色提示语。
- 8002 Edge 移动端：上传/加载附件后，附件旁无蓝色提示语。

截图：

- `docs/review/attachment-no-blue-hint-desktop.png`
- `docs/review/attachment-no-blue-hint-mobile.png`

## 本轮验证命令

```bash
node tmp/check-asset-login-logo-icons.cjs
node tmp/check-sidebar-profile-hover-and-attachment-hint.cjs
npm.cmd run ts-check
npm.cmd run build
```

结果：

- 浏览器桌面端验证：通过。
- 浏览器移动端验证：通过。
- TypeScript 检查：通过。
- 生产构建：通过。

## 交接说明

- 本轮均为局部 UI 调整，未改变核心登录、会话、资产、附件、知识库等业务接口流程。
- 当前会话中存在较多历史工作区改动，本文档只记录本轮已确认并验证的 UI 修改点。
- 端口约束：验证使用 `http://127.0.0.1:8002`，未变更端口。
