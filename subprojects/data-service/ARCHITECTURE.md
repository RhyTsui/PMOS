# 数据服务项目架构

## 目录结构
```
data-service/
├── src/                    # 源代码
│   ├── index.ts            # 服务入口
│   ├── services/           # 业务服务
│   ├── models/             # 数据模型
│   └── utils/              # 工具函数
├── config/                 # 配置文件
├── docs/                   # 项目文档
│   ├── memory/             # 项目记忆
│   └── api/                # API 文档
├── tests/                  # 测试代码
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
└── subproject.json         # 子项目配置
```

## 技术栈
- 运行时：Node.js + TypeScript
- 数据库：待配置
- 缓存：待配置

## 模块划分
1. **数据接入** - 多源数据导入与清洗
2. **数据服务** - 查询、转换、导出
3. **API 接口** - 统一数据服务接口

## 待补充
- 具体技术选型
- 数据库设计
- API 规范
