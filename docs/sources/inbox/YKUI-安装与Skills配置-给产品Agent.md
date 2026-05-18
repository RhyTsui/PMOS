# YKUI（@yoka-ui/ui）安装 & Skills 配置（给产品同学的 Agent 工具阅读）

这份文档的目标：让 **Agent** 直接按步骤把 `@yoka-ui/ui` 安装到项目里，并把对应的 **Skills（规则/提示）** 放到正确目录，让 IDE/Agent 能识别并使用。

---

## 0. 你需要准备什么（Agent 自检清单）

- 已拿到要安装的业务项目源码目录（有 `package.json` 的那个目录）
- 本机已安装 Node.js（建议 18+）
- 已安装包管理器（以下以 `npm` 举例，`pnpm/yarn` 也可以）

---

## 1. 安装组件库依赖（Agent 执行）

在项目根目录（`package.json` 所在目录）执行：

```bash
npm i @yoka-ui/ui
```

---

## 2. 引入全局样式（Agent 选择其一）

在你的业务入口文件（例如 `src/main.tsx` / `src/index.tsx` / `app.tsx` 等）按需加入：

```ts
import '@yoka-ui/ui/dist/index.less';
```

> 如果项目里样式入口不同，以项目自身结构为准；路径以 `@yoka-ui/ui` 的 README / 当前产物导出为准。

---

## 3. 使用组件（Agent 示例）

从包入口做 **具名导入**：

```ts
import { YkPorjectSelect } from '@yoka-ui/ui';
```

不确定可用导出时，以安装后的权威清单为准：

- `node_modules/@yoka-ui/ui/@Docs-yoka/exports.generated.md`

---

## 4. 安装 Skills（让 Agent/IDE 识别规则）

在对应 IDE 的 rules 目录中创建文件 `yoka-ui.mdc`，内容如下（原样复制）：

```md
---
description: 使用 @yoka/ui 时的导入与文档约定
globs: "**/*.{ts,tsx}"
alwaysApply: false
---

# @yoka/ui

- **导入**：仅从 `@yoka/ui` 做**具名** `import`，勿使用未在导出表中出现的符号。
- **导出清单（权威）**：以安装包内 `node_modules/@yoka/ui/@Docs-yoka/exports.generated.md` 为准，与发布产物类型一致；该文件由 yoka-ui 在导出变更后重新生成。
- **LLM / 助手入口**：同目录 `node_modules/@yoka/ui/@Docs-yoka/llms.txt`（索引、外链与使用规则摘要）。
- **API**：不确定 props 时查组件库 Storybook / 源码示例或 README，勿臆造 API；原生 antd 行为对照 [Ant Design 文档](https://ant.design)。
- **全局样式**：业务入口按需引入，常见为 `import '@yoka/ui/dist/index.less'`（以 `@yoka/ui` 的 README 与当前产物路径为准）。
```

---

## 5. 给 Agent 的“查资料入口”（遇到不确定时优先查）

- **导出清单（权威）**：`node_modules/@yoka-ui/ui/@Docs-yoka/exports.generated.md`
- **LLM/助手索引**：`node_modules/@yoka-ui/ui/@Docs-yoka/llms.txt`
- **组件行为对照**：Ant Design 文档（当组件封装基于 antd 行为时）

---

## 6. 成功验收（Agent 可自动检查）

- 依赖已安装：`node_modules/@yoka-ui/ui` 存在
- 业务代码能正常 `import { ... } from "@yoka-ui/ui"`
- IDE/Agent 能识别到安装的 Skills（规则生效、对话能引用规则约束）
