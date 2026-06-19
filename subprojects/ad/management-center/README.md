# management-center/ — 管理中心配置导入

> 本目录存放管理后台的配置导入文件（Skill、Workflow、Capability Binding、Prompts 等 JSON）。
> 这些文件用于通过管理后台批量导入配置，不是代码真源。

## 目录结构

```
management-center/
└── import/                          # 批量导入文件
    ├── *.skill.json                 # Skill 定义
    ├── *.workflow.json              # Workflow 定义
    ├── *.capability-binding.example.json  # 能力绑定示例
    └── *.prompts.json               # 提示词配置
```

## 使用方式

通过管理后台的导入功能加载这些 JSON 文件。导入后配置会进入对应的 store（`skill-contract-store.ts`、`workflow-engine.ts`、`prompt-store.ts` 等）。
