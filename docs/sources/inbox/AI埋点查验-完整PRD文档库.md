# AI埋点查验-完整PRD文档库

完整PRD文档库

文档结构总览

text

PRD文档库/

├── COMMON/

│   ├── COMMON-01 产品体系概述.md

│   ├── COMMON-02 埋点Schema标准.md

│   ├── COMMON-03 知识库规范.md

│   └── COMMON-04 规则校验引擎.md

│

├── CODE/（产品一：AI Coding埋点引擎）

│   ├── CODE-01 产品概述.md

│   ├── CODE-02 项目初始化与配置.md

│   ├── CODE-03 埋点需求文档导入.md

│   ├── CODE-04 AI埋点代码生成.md

│   ├── CODE-05 实时规则校验.md

│   ├── CODE-06 本地自动化测试.md

│   ├── CODE-07 IDE集成.md

│   ├── CODE-08 CLI与CI集成.md

│   ├── CODE-09 MCP接口设计.md

│   └── CODE-10 埋点需求文档标准.md

│

└── PLAT/（产品二：埋点查验平台）

    ├── PLAT-01 产品概述.md

    ├── PLAT-02 项目管理.md

    ├── PLAT-03 埋点需求管理.md

    ├── PLAT-04 AI智能助手Agent.md

    ├── PLAT-05 实时数据查询.md

    ├── PLAT-06 验收管理.md

    ├── PLAT-07 线上质量监控.md

    ├── PLAT-08 AI分析引擎.md

    └── PLAT-09 集成与开放平台.md

COMMON部分：通用基础规范

COMMON-01 产品体系概述

1. 文档信息

项目 内容

文档ID COMMON-01

文档版本 V1.0

创建日期 2026-04-28

产品名称 EventIQ 游戏埋点智能验收体系

产品类型 B端工具/SaaS

文档状态 草稿

作者 产品团队

2. 修订记录

版本 日期 修订人 修订内容

V1.0 2026-04-28 - 初始版本建立

3. 产品愿景

一句话：用AI重塑游戏埋点工作流，让埋点从"人工抽检的体力活"变为"智能全量的自动化"，实现"写需求即完成埋点"。

愿景描述：

传统游戏埋点流程中，策划写Excel、开发手动编码、测试肉眼验收、数据运营被动发现问题，整个链路低效且容易出错。EventIQ通过AI能力贯穿埋点全生命周期，让埋点需求能被AI理解、代码能被AI生成、验收能被AI自动化、质量能被AI监控，最终实现埋点开发的"自动驾驶"。

4. 产品矩阵

text

┌─────────────────────────────────────────────────────┐

│                 EventIQ 产品矩阵                      │

│                                                     │

│  EventIQ-Code          EventIQ-Platform             │

│  (AI Coding引擎)        (查验平台)                   │

│  ┌─────────────┐       ┌──────────────┐            │

│  │ IDE插件     │       │ Web控制台    │            │

│  │ CLI工具     │◄─────►│ 多角色协同   │            │

│  │ MCP Server  │ 联动  │ AI Agent     │            │

│  └─────────────┘       └──────────────┘            │

│        │                      │                     │

│        └──────────┬───────────┘                     │

│                   ▼                                 │

│  ┌─────────────────────────────────────┐           │

│  │           共用基座                    │           │

│  │  EventIQ-Knowledge (知识库)          │           │

│  │  EventIQ-Rules    (规则引擎)         │           │

│  │  EventIQ-Schema   (埋点标准)         │           │

│  └─────────────────────────────────────┘           │

└─────────────────────────────────────────────────────┘

5. 目标用户画像

5.1 用户角色矩阵

用户角色 典型岗位 核心场景 使用产品 使用频率 技术水平

客户端开发 Unity/Unreal开发工程师 编写埋点代码、本地自测 Code 每日 技术专家

服务器开发 Java/Go/C++后端开发 编写服务端埋点 Code 按需 技术专家

游戏策划 系统策划/数值策划 定义埋点需求、关联分析场景 Platform 版本迭代时 业务专家

测试工程师 QA 验收埋点、提交问题 Platform 版本测试期 中等

数据分析师 数据运营/BI 消费埋点数据、发现质量问题 Platform 每日 数据专家

项目经理 PM/制作人 查看进度、质量兜底 Platform 每周 中等

技术负责人 主程/技术总监 审批规范变更、质量把控 Code+Platform 按需 技术专家

5.2 用户痛点详析

痛点 影响角色 现状描述 严重程度

文档与代码两张皮 全角色 Excel方案和代码实现经常不一致，靠人工对 🔴 高

埋点命名混乱 开发+数据 无统一规范，同功能不同开发可能命名不同 🔴 高

验收效率低 测试 手动跑游戏、看日志、对Excel，100个埋点要验一天 🔴 高

参数错误难以发现 数据 参数类型错误、空值等问题上线后才暴露 🟡 中

变更影响不可控 PM+数据 改了埋点不知道影响了哪些报表 🟡 中

重复性编码 开发 每个埋点代码结构相似但都要手写 🟢 低

知识孤岛 全角色 埋点经验在人脑，人走了知识就丢了 🟡 中

6. 核心指标

6.1 北极星指标

埋点验收效率提升率 = （使用前验收耗时 - 使用后验收耗时） / 使用前验收耗时 × 100%

目标V1.0：提升 70%

6.2 关键指标

指标 计算方式 当前基线 V1.0目标

验收效率提升 见上 - ≥ 70%

缺陷逃逸率 上线后发现问题数 / 总埋点数 约15% ≤ 3%

自动化验收覆盖率 自动验收事件数 / 总事件数 0% ≥ 90%

埋点开发效率提升 （原耗时-新耗时）/原耗时 - ≥ 50%

规范遵守率 符合规范事件数 / 总事件数 约60% ≥ 95%

Agent使用率 使用Agent的用户数 / 总用户数 - ≥ 40%

用户满意度NPS 用户调研 - ≥ 50

6.3 指标拆解

text

北极星：验收效率提升

├── 自动验收覆盖率 ↑

│   ├── Schema标准遵循度 ↑

│   └── 测试环境稳定性 ↑

├── 人工验收耗时 ↓

│   ├── 问题自动识别率 ↑

│   ├── 问题分发效率 ↑

│   └── 复验自动化 ↑

└── 验收质量 ↑

    ├── 缺陷逃逸率 ↓

    └── 规范遵守率 ↑

7. 产品边界

7.1 我们做什么

✅ 埋点需求的结构化管理与AI解析

✅ 埋点代码的AI生成与校验

✅ 埋点验收的自动化

✅ 埋点数据质量监控

✅ 多角色的协同与流程管理

7.2 我们不做（V1.0）

❌ 替代数据分析平台（神策/数数）（我们是数据质量的守门员）

❌ 游戏引擎或编辑器本身

❌ 用户行为自动分析（V1.0不做，V2.0可考虑）

❌ A/B测试平台

❌ 热力分析、录屏回放等用户研究工具

8. 竞品分析概要

竞品 类型 优势 劣势 我们的差异化

神策/数数 数据分析平台 成熟稳定、分析能力强 只解决消费端，不解决生产端 解决"埋点怎么埋对"的问题

Firebase 大厂套件 免费、生态好 定制性差、国内适配弱 游戏行业深度定制

Excel+Jira 土法炼钢 零成本 全链路断裂 AI驱动的自动化闭环

内部自研平台 定制方案 符合公司流程 难以复用 行业标准化+AI能力

9. 商业模式（如果是SaaS）

版本 价格 功能 适合

免费版 0元/月 1个项目、500个埋点、基础功能 小团队试用

专业版 按量/年 无限项目、AI全功能、API开放 中小工作室

企业版 定制 私有化部署、专属模型、定制开发 大厂/出海公司

10. 术语表

术语 英文 说明

埋点 Event/Tracking Point 在特定时机上报的用户行为或系统状态数据

事件 Event 一次具体的埋点上报

参数 Parameter/Property 事件携带的上下文信息

Schema Schema 埋点需求的结构化描述标准

验收 Acceptance/Validation 验证实际上报与需求方案的一致性

触发时机 Trigger 事件在什么条件下被触发上报

枚举值 Enum Value 参数的可选值集合

SAC Static Analysis Check 静态分析检查（代码层面）

DAC Dynamic Analysis Check 动态分析检查（运行时数据）

MCP Model Context Protocol AI工具之间的标准通信协议

COMMON-02 埋点Schema标准

1. 文档信息

项目 内容

文档ID COMMON-02

文档版本 V1.0

依赖文档 COMMON-01

2. 设计原则

AI可解析：结构化的YAML/JSON，而非自由文本

人类可读：关键字段有双语支持，注释清晰

版本兼容：向前向后兼容，有版本号标识

最小完备：必填字段足够小，扩展字段足够多

代码可映射：每个字段都能在代码层面找到对应

3. 核心Schema定义

3.1 完整事件定义（JSON Schema格式）

json

{

  "$schema": "[https://eventiq.dev/schema/v1/event.json](https://eventiq.dev/schema/v1/event.json)",

  "schema\_version": "1.0.0",

  "event\_id": {

    "type": "string",

    "description": "事件唯一标识，建议格式：{模块}\_{序号}，如 SHOP\_001",

    "pattern": "^\[A-Z\]+\_\\d{3}$",

    "required": true,

    "example": "SHOP\_001"

  },

  "event\_name": {

    "type": "string",

    "description": "事件英文名，遵循snake\_case，格式：{模块}\_{动作}\_{对象}",

    "pattern": "^\[a-z\]+\_\[a-z\]+\_\[a-z0-9\_\]+$",

    "required": true,

    "example": "shop\_click\_buy\_button"

  },

  "event\_display": {

    "type": "string",

    "description": "事件中文名，便于非技术人员理解",

    "required": true,

    "example": "商城-点击购买按钮"

  },

  "event\_category": {

    "type": "string",

    "description": "事件分类",

    "enum": \["user\_behavior", "system\_event", "business\_event", "performance", "error"\],

    "required": true

  },

  "platform": {

    "type": "array",

    "description": "适用平台",

    "items": {

      "type": "string",

      "enum": \["ios", "android", "pc", "h5", "server"\]

    },

    "required": true

  },

  "version": {

    "type": "string",

    "description": "首次引入的游戏版本号",

    "required": true,

    "example": "2.4.0"

  },

  "status": {

    "type": "string",

    "enum": \["draft", "reviewing", "approved", "active", "deprecated"\],

    "description": "事件状态",

    "required": true

  },

  "trigger": {

    "type": "object",

    "required": true,

    "properties": {

      "type": {

        "type": "string",

        "enum": \[

          "ui\_click", "ui\_show", "ui\_close",

          "server\_logic", "client\_action",

          "timer", "lifecycle", "network\_callback",

          "game\_event", "custom"

        \],

        "description": "触发类型",

        "required": true

      },

      "description": {

        "type": "string",

        "description": "触发时机的自然语言描述",

        "required": true,

        "example": "当玩家点击商城面板中的购买按钮时触发"

      },

      "condition": {

        "type": "string",

        "description": "触发条件表达式，伪代码格式",

        "required": false,

        "example": "player.level >= 5 && shop.panel == 'DailySpecial'"

      },

      "code\_hint": {

        "type": "string",

        "description": "AI代码生成提示：代码应插入的位置/方法",

        "required": false,

        "example": "DailySpecialPanel.OnBuyButtonClick()"

      }

    }

  },

  "params": {

    "type": "array",

    "description": "参数列表",

    "required": true,

    "items": {

      "type": "object",

      "required": \["param\_name", "param\_type", "required"\],

      "properties": {

        "param\_name": {

          "type": "string",

          "pattern": "^\[a-z\]\[a-z0-9\_\]\*$",

          "description": "参数名，snake\_case",

          "example": "item\_price"

        },

        "param\_display": {

          "type": "string",

          "description": "参数中文名",

          "example": "商品价格"

        },

        "param\_type": {

          "type": "string",

          "enum": \["string", "int", "long", "float", "double", "boolean", "array", "object", "enum"\],

          "description": "参数类型"

        },

        "required": {

          "type": "boolean",

          "description": "是否必填"

        },

        "enum\_values": {

          "type": "array",

          "items": {},

          "description": "枚举值列表（当param\_type为enum时必填）"

        },

        "value\_range": {

          "type": "object",

          "properties": {

            "min": {"type": "number"},

            "max": {"type": "number"}

          },

          "description": "参数值范围"

        },

        "string\_length": {

          "type": "integer",

          "description": "字符串最大长度限制"

        },

        "default\_value": {

          "description": "默认值"

        },

        "example": {

          "description": "示例值"

        },

        "data\_source": {

          "type": "string",

          "description": "参数数据来源（供AI生成代码参考）",

          "example": "this.currentItem.Price"

        },

        "sensitive": {

          "type": "boolean",

          "description": "是否为敏感数据（需脱敏）",

          "default": false

        },

        "description": {

          "type": "string",

          "description": "参数业务含义说明"

        }

      }

    }

  },

  "metadata": {

    "type": "object",

    "required": \["module", "owner"\],

    "properties": {

      "module": {

        "type": "string",

        "description": "所属游戏模块",

        "required": true,

        "example": "shop"

      },

      "sub\_module": {

        "type": "string",

        "description": "子模块"

      },

      "owner": {

        "type": "string",

        "description": "负责策划的ID/姓名"

      },

      "developer": {

        "type": "string",

        "description": "负责开发的ID/姓名"

      },

      "priority": {

        "type": "string",

        "enum": \["P0", "P1", "P2", "P3"\],

        "description": "优先级",

        "default": "P1"

      },

      "analysis\_scenario": {

        "type": "array",

        "items": {"type": "string"},

        "description": "关联的分析场景/看板"

      },

      "related\_events": {

        "type": "array",

        "items": {"type": "string"},

        "description": "关联事件的event\_id列表"

      },

      "code\_file\_hint": {

        "type": "string",

        "description": "建议修改的代码文件路径"

      },

      "tags": {

        "type": "array",

        "items": {"type": "string"},

        "description": "自定义标签"

      }

    }

  },

  "implementation": {

    "type": "object",

    "description": "实现信息（由开发/AI自动填充）",

    "properties": {

      "status": {

        "type": "string",

        "enum": \["pending", "implemented", "testing", "tested", "released"\],

        "default": "pending"

      },

      "commit\_id": {

        "type": "string",

        "description": "关联的代码提交ID"

      },

      "code\_file": {

        "type": "string",

        "description": "实际修改的代码文件路径"

      },

      "implemented\_at": {

        "type": "string",

        "format": "date-time"

      }

    }

  },

  "acceptance": {

    "type": "object",

    "description": "验收信息（自动填充）",

    "properties": {

      "status": {

        "type": "string",

        "enum": \["pending", "passed", "failed", "not\_applicable"\]

      },

      "last\_check\_time": {

        "type": "string",

        "format": "date-time"

      },

      "issues": {

        "type": "array",

        "items": {

          "type": "object",

          "properties": {

            "issue\_id": {"type": "string"},

            "severity": {"type": "string", "enum": \["critical", "major", "minor", "suggestion"\]},

            "description": {"type": "string"},

            "status": {"type": "string", "enum": \["open", "fixed", "closed"\]}

          }

        }

      }

    }

  }

}

3.2 完整示例

yaml

schema\_version: "1.0.0"

project: "dragon\_slayer"

module: "shop"

version: "2.4.0"

events:

  - event\_id: "SHOP\_001"

    event\_name: "shop\_daily\_special\_show"

    event\_display: "每日特惠面板展示"

    event\_category: "user\_behavior"

    platform: \["ios", "android", "pc"\]

    version: "2.4.0"

    status: "approved"

    trigger:

      type: "ui\_show"

      description: "玩家打开每日特惠面板时"

      condition: "panel.active == 'DailySpecial'"

      code\_hint: "DailySpecialPanel.OnEnable()"

    params:

      - param\_name: "slot\_count"

        param\_type: "int"

        required: true

        description: "商品格子数量"

        value\_range: {min: 1, max: 12}

        example: 6

        data\_source: "this.slotList.Count"

      - param\_name: "is\_vip\_discount"

        param\_type: "boolean"

        required: true

        description: "是否享受VIP折扣"

        data\_source: "PlayerData.VipLevel >= 3"

      - param\_name: "source\_page"

        param\_type: "enum"

        required: true

        enum\_values: \["main\_ui", "battle\_pass", "event\_banner"\]

        description: "来源页面"

        data\_source: "this.sourcePage"

    metadata:

      owner: "zhangsan"

      priority: "P0"

      analysis\_scenario: \["shop\_conversion\_funnel", "daily\_activity"\]

      related\_events: \["SHOP\_002", "SHOP\_003"\]

      code\_file\_hint: "Assets/Scripts/UI/Shop/DailySpecialPanel.cs"

      tags: \["revenue", "daily"\]

    implementation:

      status: "pending"

    acceptance:

      status: "pending"

4. 命名规范

4.1 事件命名规范

格式 说明 示例

{模块}\_{动作}\_{目标} 标准格式 shop\_click\_buy\_btn

{模块}\_{系统动作} 系统事件 battle\_start

模块命名约定：

text

常用模块缩写对照表：

shop      - 商城/商店

battle    - 战斗

login     - 登录

guide     - 新手引导

social    - 社交

activity  - 活动

mail      - 邮件

bag       - 背包/仓库

task      - 任务

hero      - 英雄/角色

gacha     - 抽卡/抽奖

pay       - 支付

setting   - 设置

动作命名约定：

text

常用动作：

click     - 点击

show      - 展示

close     - 关闭

start     - 开始

end       - 结束

success   - 成功

fail      - 失败

get       - 获得

consume   - 消耗

levelup   - 升级

unlock    - 解锁

规则明细：

全小写

单词间用下划线 \_ 连接

禁止使用拼音

禁止使用缩写（电商常见缩写除外，如 ID、VIP、UI）

事件名长度 ≤ 50 字符

4.2 参数命名规范

规则 说明 正确示例 错误示例

snake\_case 小写+下划线 item\_price itemPrice

布尔值用is\_ 前缀 is\_vip vip

ID后缀 标识类型 player\_id pid

数量后缀 明确计量单位 gold\_amount gold

时长后缀 单位明确 duration\_ms time

4.3 参数标准库（通用参数）

yaml

standard\_params:

  user:

    - player\_id: {type: "string", required: true, desc: "玩家ID"}

    - player\_level: {type: "int", required: true, desc: "玩家等级"}

    - vip\_level: {type: "int", required: false, desc: "VIP等级"}

  device:

    - platform: {type: "enum", values: \["ios","android","pc"\], desc: "平台"}

    - device\_id: {type: "string", sensitive: true, desc: "设备ID（需脱敏）"}

    - client\_version: {type: "string", desc: "客户端版本号"}

  session:

    - session\_id: {type: "string", desc: "会话ID"}

    - session\_duration\_ms: {type: "long", desc: "会话时长(毫秒)"}

  scene:

    - scene\_id: {type: "string", desc: "场景ID"}

    - scene\_name: {type: "string", desc: "场景名称"}

5. 版本管理规则

5.1 版本号格式

text

主版本.次版本.修订版本

  MAJOR.MINOR.PATCH

MAJOR - Schema结构有破坏性变更时增加

MINOR - 新增可选字段或枚举值时增加

PATCH - 文档修正或示例更新时增加

5.2 向后兼容规则

新增可选字段：✅ 兼容

新增必填字段：❌ 不兼容 → MAJOR升级

删除字段：❌ 不兼容 → MAJOR升级

重命名字段：❌ 不兼容 → MAJOR升级

新增枚举值：✅ 兼容

修改字段类型：❌ 不兼容 → MAJOR升级

5.3 事件状态流转

text

draft → reviewing → approved → active → deprecated

  ↑        ↓           ↓                    ↓

  └── 驳回 ──┘          └── 暂停 ←──────────┘

状态 说明 可操作角色

draft 草稿，可编辑 策划

reviewing 审核中 PM/Tech Lead

approved 已批准，待实现 开发

active 已上线生效 全角色只读

deprecated 已废弃 PM标记

6. 扩展性设计

6.1 自定义字段

允许项目在 metadata 下添加 custom 字段：

yaml

metadata:

  custom:

    project\_internal\_id: "PRJ-12345"

    priority\_score: 8.5

6.2 多游戏类型模板继承

yaml

base\_template: "rpg\_base"

overrides:

  - event\_id: "BATTLE\_010"

    trigger:

      code\_hint: "TurnBasedBattle.OnRoundEnd()"  # 覆盖回合制战斗

6.3 参数组/宏定义

yaml

param\_groups:

  user\_basic\_info:

    params:

      - player\_id

      - player\_level

      - vip\_level

events:

  - event\_name: "shop\_click\_buy"

    params:

      - $ref: "user\_basic\_info"  # 引用参数组

      - param\_name: "item\_price"

        ...

COMMON-03 知识库规范

1. 文档信息

项目 内容

文档ID COMMON-03

文档版本 V1.0

2. 知识库定位

EventIQ知识库是产品体系的核心资产，存储游戏埋点领域的结构化知识，供AI代码生成和Agent问答使用，确保AI输出的一致性、准确性和行业专业性。

3. 知识库目录结构

text

EventIQ-Knowledge/

│

├── 01-埋点规范/

│   ├── 01-命名规范.md

│   │   ├── 章节：事件命名规则

│   │   ├── 章节：参数命名规则

│   │   └── 章节：常见错误命名示例

│   │

│   ├── 02-参数标准库.yaml

│   │   ├── 通用参数定义

│   │   ├── 模块级参数

│   │   └── 平台差异参数

│   │

│   ├── 03-敏感数据脱敏规则.md

│   │   ├── 敏感字段清单

│   │   ├── 脱敏算法

│   │   └── 合规要求（GDPR/个保法）

│   │

│   └── 04-多平台差异规范/

│       ├── iOS埋点注意事项.md

│       ├── Android埋点注意事项.md

│       └── PC埋点注意事项.md

│

├── 02-游戏品类模板/

│   ├── slg\_template.yaml

│   ├── moba\_template.yaml

│   ├── rpg\_template.yaml

│   ├── card\_template.yaml

│   ├── casual\_template.yaml

│   ├── fps\_template.yaml

│   └── battle\_royale\_template.yaml

│

├── 03-分析模型模板/

│   ├── 01-用户留存模型.yaml

│   ├── 02-付费转化模型.yaml

│   ├── 03-新手引导漏斗.yaml

│   ├── 04-社交传播模型.yaml

│   ├── 05-活动效果模型.yaml

│   ├── 06-战斗平衡模型.yaml

│   └── 07-经济系统模型.yaml

│

├── 04-SDK引擎适配/

│   ├── 01-Unity埋点封装最佳实践.md

│   ├── 02-Unreal埋点封装最佳实践.md

│   ├── 03-Cocos埋点封装最佳实践.md

│   └── 04-自研引擎接入指南.md

│

├── 05-反模式库/

│   ├── 01-常见埋点错误Top30.md

│   ├── 02-性能陷阱.md

│   ├── 03-数据质量事故案例库.md

│   └── 04-参数类型误用案例.md

│

└── 06-项目私有规范/

    └── {project\_name}/

        ├── 命名前缀规范.md

        ├── 自有SDK封装签名.ts

        └── 特殊业务规则.md

4. 知识条目详细设计

4.1 游戏品类模板设计（以RPG为例）

yaml

# rpg\_template.yaml

category: "rpg"

version: "1.2.0"

description: "RPG游戏埋点模板，覆盖核心系统"

maintainer: "EventIQ Team"

modules:

  battle:

    description: "战斗系统"

    required\_events:

      - battle\_start

      - battle\_end

      - hero\_skill\_use

    optional\_events:

      - battle\_pause

      - battle\_auto\_mode\_toggle

  hero:

    description: "英雄/角色系统"

    required\_events:

      - hero\_level\_up

      - hero\_equip\_change

      - hero\_skill\_upgrade

    optional\_events:

      - hero\_skin\_change

      - hero\_formation\_change

  gacha:

    description: "抽卡系统"

    required\_events:

      - gacha\_pull\_start

      - gacha\_pull\_result

      - gacha\_pity\_system\_trigger

    notes: "抽卡结果必须包含 gacha\_type 和 rarity 参数"

  shop:

    description: "商城"

    required\_events:

      - shop\_page\_show

      - shop\_item\_click

      - purchase\_start

      - purchase\_success

      - purchase\_fail

    recommended\_funnel: "shop\_page\_show → shop\_item\_click → purchase\_start → purchase\_success"

    common\_params:

      - shop\_type

      - item\_id

      - item\_price

      - currency\_type

analysis\_scenarios:

  retention:

    - login

    - tutorial\_complete

    - first\_battle\_complete

    - d2\_login

    - d7\_login

  monetization:

    - first\_purchase

    - purchase\_amount

    - whale\_behavior\_patterns

  engagement:

    - daily\_active\_minutes

    - session\_count

    - feature\_usage\_ranking

4.2 分析模型模板设计（以付费转化模型为例）

yaml

# 付费转化模型.yaml

model\_id: "monetization\_conversion"

model\_name: "付费转化分析模型"

version: "2.1.0"

applicable\_categories: \["all"\]

description: |

  分析玩家从免费用户到付费用户的转化全过程。

  关注首次付费节点和重复付费行为。

required\_events:

  - event\_id: "pay\_page\_show"

    display: "付费页面展示"

    note: "漏斗起点"

  - event\_id: "pay\_item\_click"

    display: "点击付费项目"

  - event\_id: "pay\_confirm\_dialog\_show"

    display: "支付确认弹窗"

  - event\_id: "pay\_confirm\_click"

    display: "确认支付"

  - event\_id: "pay\_result"

    display: "支付结果"

    required\_params:

      - result: \["success", "fail", "cancel"\]

      - amount

      - currency\_type

      - product\_id

      - is\_first\_purchase

funnel:

  name: "付费转化漏斗"

  steps:

    - step: 1

      event: "pay\_page\_show"

      name: "进入付费页"

      expected\_rate: "100%"

    - step: 2

      event: "pay\_item\_click"

      name: "点击商品"

      expected\_rate: "60-70%"

    - step: 3

      event: "pay\_confirm\_click"

      name: "确认支付"

      expected\_rate: "30-40%"

    - step: 4

      event: "pay\_result"

      name: "支付成功"

      condition: "result == 'success'"

      expected\_rate: "25-35%"

key\_metrics:

  - payment\_conversion\_rate

  - first\_purchase\_rate

  - arppu

  - ltv\_7d

expert\_tips: |

  1. 支付成功事件必须确保不丢（考虑弱网重试）

  2. first\_purchase标志位要在服务端验证，防客户端伪造

  3. 支付失败事件对排查支付SDK问题非常重要

4.3 反模式库设计

markdown

# 常见埋点错误Top30

## 错误01：在主循环中直接上报

\*\*严重程度\*\*：🔴 严重

\*\*错误代码（Unity）\*\*：

\`\`\`csharp

void Update() {

    TrackEvent("player\_position", position); // 每帧上报！

}

正确做法：

csharp

float lastReportTime = 0;

float reportInterval = 5f; // 每5秒上报一次

void Update() {

    if(Time.time - lastReportTime > reportInterval) {

        TrackEvent("player\_position", position);

        lastReportTime = Time.time;

    }

}

校验规则：检测 Update/FixedUpdate/LateUpdate 中的埋点调用

规则ID：PERF-001

错误02：上报前未判空

...

错误03：参数类型与文档不一致

...

text

## 5. 知识库更新机制

### 5.1 更新流程

知识贡献者提交PR

↓

AI自动校验（格式、一致性）

↓

领域专家Review

↓

合入staging分支

↓

回归测试（验证AI生成质量不降级）

↓

发布新版本知识库

↓

通知所有关联项目

text

### 5.2 版本管理

知识库版本号：YYYY.MM.PATCH

例如：2026.04.2 （2026年4月第2个补丁版本）

Changelog要求：

新增了哪些知识条目

修改了哪些条目及原因

废弃了哪些条目及替代方案

text

### 5.3 反馈闭环

线上发现问题 → 反馈到知识