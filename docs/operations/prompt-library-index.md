# PMAIOS Prompt 文档集

- version: v0.5
- status: active
- owner: product office

## 1. 文档集目标

这份文档集用于解决两个问题：

1. 当前 PMAIOS 到底在用哪些 prompt。
2. 这些 prompt 的全文和明细应该去哪里查看。

PMAIOS 的原则不是“只给 prompt 名称”，而是让使用中的 prompt 来源、路径、作用和查看入口都能被追踪。

## 2. 查看入口

当前可用的统一查看入口有两个：

1. 运行态 Wiki：`/pmaios/wiki`
2. 仓库真源文档：本文件与相关 prompt 源文件

其中 `/pmaios/wiki` 已按系统真实引用的 `promptPath` 聚合展示 prompt 资产，不再只限于 `prompts/` 目录。

## 3. 设计交付相关 prompt 规则

设计交付链当前默认使用 `image2`，并增加了逐页 prompt pack 机制。核心要求如下：

1. 设计图前必须先产出 page inventory。
2. 必须逐页产出 `image2` prompt。
3. 要求高清输出。
4. 不允许遗漏页面。
5. prompt pack 要可复查、可复用、可继续生成设计图。

核心源文件：

- `prompts/product-management/product_management_agent_prompt.md`
- `prompts/product-management/virtual_delivery_pm_prompt.md`
- `docs/templates/design_image2_prompt_pack_template.md`

## 4. 当前本地 prompt 资产索引

### 4.1 核心 prompts 目录

- `prompts/architecture_prompt.md`
- `prompts/industry_analysis_prompt.md`
- `prompts/prd_prompt.md`
- `prompts/review_prompt.md`
- `prompts/task_prompt.md`

### 4.2 Product Management prompts

- `prompts/product-management/product_management_agent_prompt.md`
- `prompts/product-management/virtual_delivery_pm_prompt.md`
- `prompts/product-management/virtual_requirements_pm_prompt.md`
- `prompts/product-management/virtual_retrospective_pm_prompt.md`
- `prompts/product-management/virtual_review_pm_prompt.md`
- `prompts/product-management/virtual_version_pm_prompt.md`
- `prompts/product-management/virtual_workflow_pm_prompt.md`

### 4.3 Blueprint / registry 级 prompt 来源

这些文件不是单条 prompt，但它们定义了系统当前真实使用的 `promptPath`：

- `config/product-management/agent-blueprints.json`
- `skills/registry.json`

### 4.4 模板级 prompt 资产

以下模板会被系统作为 prompt 或 prompt 结构资产引用：

- `docs/templates/design_image2_prompt_pack_template.md`
- `docs/templates/ui_schema_spec_template.md`

## 5. 推荐查看顺序

如果你要检查“设计交付是不是按规则执行”，建议按这个顺序看：

1. `docs/operations/pmaios-introduction.md`
2. `prompts/product-management/product_management_agent_prompt.md`
3. `prompts/product-management/virtual_delivery_pm_prompt.md`
4. `docs/templates/design_image2_prompt_pack_template.md`
5. `/pmaios/wiki`

如果你要检查“系统到底引用了哪些 prompt”，优先看：

1. `skills/registry.json`
2. `config/product-management/agent-blueprints.json`
3. `/pmaios/wiki`

## 6. 这份文档集解决了什么

围绕当前用户需求，这份文档集解决的是：

- 不再只说“系统有 prompt”
- 能定位到 prompt 在哪里
- 能查看设计交付相关 prompt 的完整细节
- 能把 image2、高清输出、不漏页的规则追溯到具体源文件

状态判断：

- 文档集已建立：`solved`
- prompt 明细可查看：`solved`
- 设计 prompt 规则可追踪：`solved`
