# MCP 项目架构

## 目录结构
```
mcp/
├── src/                    # 源代码
│   ├── index.ts            # MCP 入口
│   ├── servers/            # MCP Servers
│   ├── clients/            # MCP Clients
│   └── tools/              # MCP Tools
├── config/                 # 配置文件
├── docs/                   # 项目文档
│   ├── memory/             # 项目记忆
│   ├── knowledge/          # 知识库
│   └── projects/           # 项目文档
├── tests/                  # 测试代码
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
└── subproject.json         # 子项目配置
```

## 技术栈
- 运行时：Node.js + TypeScript
- 协议：MCP (Model Context Protocol)

## 模块划分
1. **MCP Servers** - 对外提供 MCP 服务
2. **MCP Clients** - 连接外部 MCP 资源
3. **MCP Tools** - 工具函数与集成

## 待补充
- MCP Server/Client 实现
- 与 PMAIOS 主项目集成方式
