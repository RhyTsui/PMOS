# Subproject Directory Standard

- 日期：2026-04-17
- 状态：Draft
- 适用范围：`subprojects/*`

## 1. 目标

当前子项目目录有历史包袱，结构不统一。

问题主要有三类：

- 有的项目偏代码仓结构
- 有的项目偏资料仓结构
- 有的项目只有 `docs/`，有的项目同时有 `src/ / frontend/ / tests/`

这会导致：

- 项目切换成本高
- AI 和人都难以快速定位材料
- 平台能力难以稳定复用

所以后续子项目目录应逐步向统一标准收敛。

## 2. 推荐标准结构

每个子项目建议逐步收敛为：

```text
subprojects/<project-id>/
  subproject.json
  README.md
  docs/
    memory/
      project-memory.md
    context/
    requirements/
    versions/
    decisions/
    tasks/
    review/
  prompts/
  skills/
  src/
  frontend/
  tests/
  scripts/
  infra/
```

不是所有目录都必须同时存在，但语义应尽量统一。

## 3. 各目录职责

### 基础定义

- `subproject.json`
  - 项目注册信息
  - 平台识别该项目的主入口
- `README.md`
  - 项目总说明
  - 当前状态、目标、主要路径

### 文档与运行资料

- `docs/memory/`
  - 项目长期记忆
- `docs/context/`
  - 项目上下文输入
- `docs/requirements/`
  - 项目级需求沉淀
- `docs/versions/`
  - 项目版本记录
- `docs/decisions/`
  - 项目已生效决策
- `docs/tasks/`
  - 项目任务与推进材料
- `docs/review/`
  - 项目评审材料

### 执行能力

- `prompts/`
  - 项目定制 prompt
- `skills/`
  - 项目定制 skills / registry override
- `src/`
  - 后端或核心业务代码
- `frontend/`
  - 前端代码
- `tests/`
  - 测试
- `scripts/`
  - 辅助脚本
- `infra/`
  - 部署与基础设施

## 4. 平台层与项目层的边界

平台层负责：

- 统一规则
- 通用模板
- 通用工作流
- 通用产品管理能力

子项目层负责：

- 项目特有需求
- 项目特有上下文
- 项目特有实现和交付物

不建议把平台级规则继续散落在各子项目目录里。

## 5. 当前迁移原则

当前阶段先遵循这三个原则：

1. 不急着大搬迁现有项目
2. 先给每个项目补齐职责说明
3. 新增内容优先按新标准落位

也就是说：

- 旧目录先兼容
- 新结构先定义
- 以后逐步归并

## 6. 当前建议动作

对每个子项目，建议分三步补齐：

1. 补 `README.md`
2. 补 `subproject.json` 与 `docs/memory/project-memory.md`
3. 按实际需要再补 `requirements / versions / decisions / tasks / review`

## 7. 特别提醒

`subprojects/` 不是人工输入总入口。

如果你有新的原始材料，不确定属于哪个项目，仍然先放：

- `docs/sources/inbox/`

然后再由 PMAIOS 帮你分发到平台层或项目层。
