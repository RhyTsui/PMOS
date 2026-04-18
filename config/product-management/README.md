# Product Management Config

该目录存放 `PMAIOS` 产品管理体系的可执行配置，而不是分析文档。

当前约定：

- `agent-blueprints.json`
  - 定义平台默认虚拟产品主管与各虚拟产品经理蓝图
  - 由 `ProductAgentService.bootstrapManagementHierarchy()` 读取
  - 用于把角色体系实例化到 `docs/memory/product-agents/`

如果后续继续扩展，这里应优先放：

- 角色蓝图
- 调用策略
- 子项目接入规则
- 检查清单映射
