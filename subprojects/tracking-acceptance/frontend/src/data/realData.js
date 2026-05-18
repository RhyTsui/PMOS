export const platformTopNav = [
    {
        "label":  "工作台"
    },
    {
        "label":  "数据开发"
    },
    {
        "label":  "数据集成"
    },
    {
        "label":  "数据建模"
    },
    {
        "active":  true,
        "label":  "数据上报"
    },
    {
        "label":  "数据质量"
    },
    {
        "label":  "运维中心"
    },
    {
        "label":  "注册中心"
    },
    {
        "label":  "认证中心"
    }
];
export const secondaryMenus = [
    {
        "id":  "workbench",
        "label":  "总览",
        "hint":  "问题主轴、主链路和本周目标"
    },
    {
        "id":  "requirements",
        "label":  "需求中心",
        "hint":  "围绕业务链路组织需求与接入范围"
    },
    {
        "id":  "events",
        "label":  "文档基线",
        "hint":  "标准事件、自定义事件、字段与版本差异"
    },
    {
        "id":  "fields",
        "label":  "规则中心",
        "hint":  "必填、枚举、格式和冲突确认"
    },
    {
        "id":  "integration",
        "label":  "接入协同",
        "hint":  "平台、端侧、包体与责任矩阵"
    },
    {
        "id":  "logs",
        "label":  "验收与协作",
        "hint":  "日志核验、异常清单、知识链接与报告"
    },
    {
        "id":  "acceptance",
        "label":  "验收中心",
        "hint":  "自动校验、人工确认和结果沉淀"
    },
    {
        "id":  "versions",
        "label":  "版本治理",
        "hint":  "版本差异、历史追溯和继承"
    },
    {
        "id":  "ai",
        "label":  "AI助手",
        "hint":  "输入提炼、文档标准化、规则生成、结果总结"
    }
];
export const roleGuides = [
    {
        "id":  "analysis",
        "label":  "数分",
        "onboarding":  "优先确认文档基线、规则灰区和验收结论。",
        "summary":  [
                        {
                            "label":  "当前待办",
                            "note":  "基线确认与规则会签",
                            "value":  "6"
                        },
                        {
                            "label":  "P0 问题",
                            "note":  "来自真实 RM 文档风险词",
                            "value":  "12"
                        },
                        {
                            "label":  "待确认规则",
                            "note":  "含未发送/未获取/推荐项",
                            "value":  "18"
                        },
                        {
                            "label":  "本周目标",
                            "note":  "先跑通最小闭环",
                            "value":  "完成基线首轮确认"
                        }
                    ],
        "quickActions":  [
                             {
                                 "desc":  "核定标准事件、自定义事件和字段差异",
                                 "title":  "确认文档基线"
                             },
                             {
                                 "desc":  "优先看新手、支付和透传三条链",
                                 "title":  "查看高风险链路"
                             },
                             {
                                 "desc":  "确认例外、排除和后续待办",
                                 "title":  "审阅验收结论"
                             }
                         ],
        "qa":  [
                   "哪些字段在文档中标了未获取但业务影响高？",
                   "当前哪些规则还停留在灰区？",
                   "本周最需要收口的 P0 问题是什么？"
               ],
        "taskMap":  [
                        "输入确认",
                        "文档基线",
                        "规则确认",
                        "验收结论",
                        "结果沉淀"
                    ]
    },
    {
        "id":  "client-dev",
        "label":  "游戏客户端",
        "onboarding":  "优先看事件基线与透传字段，再确认平台差异。",
        "summary":  [
                        {
                            "label":  "当前待办",
                            "note":  "事件触发与字段补齐",
                            "value":  "8"
                        },
                        {
                            "label":  "P0 问题",
                            "note":  "Tutorial 与透传为主",
                            "value":  "5"
                        },
                        {
                            "label":  "待确认规则",
                            "note":  "步骤与设备字段",
                            "value":  "9"
                        },
                        {
                            "label":  "本周目标",
                            "note":  "先确保基础链与新手链",
                            "value":  "补齐客户端链路"
                        }
                    ],
        "quickActions":  [
                             {
                                 "desc":  "按真实事件清单核对 SDK 和前端事件",
                                 "title":  "查看客户端事件"
                             },
                             {
                                 "desc":  "确认 cpsid、device_id、c_oneid",
                                 "title":  "核对透传字段"
                             },
                             {
                                 "desc":  "直接进入验收与协作页看真实日志",
                                 "title":  "查看异常样本"
                             }
                         ],
        "qa":  [
                   "TutorialStep 的必填字段当前缺什么？",
                   "哪些事件是前端/SDK 共同负责？",
                   "微信小游戏与原生包差异在哪里？"
               ],
        "taskMap":  [
                        "看事件",
                        "看字段",
                        "修触发",
                        "查样本",
                        "回归"
                    ]
    },
    {
        "id":  "server-dev",
        "label":  "游戏服务端",
        "onboarding":  "优先看支付、发货通知和服务端自定义事件。",
        "summary":  [
                        {
                            "label":  "当前待办",
                            "note":  "支付链与透传回写",
                            "value":  "7"
                        },
                        {
                            "label":  "P0 问题",
                            "note":  "order_id / channel_order_id",
                            "value":  "6"
                        },
                        {
                            "label":  "待确认规则",
                            "note":  "服务端例外与环境切换",
                            "value":  "8"
                        },
                        {
                            "label":  "本周目标",
                            "note":  "先确保订单可回查",
                            "value":  "闭合支付链"
                        }
                    ],
        "quickActions":  [
                             {
                                 "desc":  "核对 106/221/205 及订单字段",
                                 "title":  "查看支付链"
                             },
                             {
                                 "desc":  "核对 s_oneid 与渠道字段",
                                 "title":  "确认服务端透传"
                             },
                             {
                                 "desc":  "把未发送字段转成显式结论",
                                 "title":  "处理高危异常"
                             }
                         ],
        "qa":  [
                   "哪些支付字段是文档里明确未获取的？",
                   "哪些问题会阻塞上线？",
                   "支付测试环境和生产环境是否分流清楚？"
               ],
        "taskMap":  [
                        "看支付链",
                        "看透传",
                        "修回调",
                        "复验",
                        "归档"
                    ]
    },
    {
        "id":  "sdk-client",
        "label":  "SDK客户端",
        "onboarding":  "优先看 SDK 自动事件与公共字段。",
        "summary":  [
                        {
                            "label":  "当前待办",
                            "note":  "SDK 初始化、登录、支付流程",
                            "value":  "5"
                        },
                        {
                            "label":  "P0 问题",
                            "note":  "公共字段说明不足",
                            "value":  "4"
                        },
                        {
                            "label":  "待确认规则",
                            "note":  "SDK 自动与研发自定义边界",
                            "value":  "6"
                        },
                        {
                            "label":  "本周目标",
                            "note":  "先减少跨项目歧义",
                            "value":  "统一 SDK 公共字段"
                        }
                    ],
        "quickActions":  [
                             {
                                 "desc":  "核对 111/114/102/104/105 等自动事件",
                                 "title":  "查看 SDK 事件"
                             },
                             {
                                 "desc":  "核对 device_id、channel、app_version",
                                 "title":  "查看公共字段"
                             },
                             {
                                 "desc":  "确认哪些字段必传",
                                 "title":  "查看规则草稿"
                             }
                         ],
        "qa":  [
                   "SDK 自动事件有哪些？",
                   "哪些字段必须由 SDK 提供？",
                   "哪些说明仍然为空白？"
               ],
        "taskMap":  [
                        "看自动事件",
                        "看公共字段",
                        "补说明",
                        "回写基线"
                    ]
    },
    {
        "id":  "sdk-server",
        "label":  "SDK服务端",
        "onboarding":  "优先看服务端回传和支付回调字段。",
        "summary":  [
                        {
                            "label":  "当前待办",
                            "note":  "回传与服务端联动",
                            "value":  "4"
                        },
                        {
                            "label":  "P0 问题",
                            "note":  "发货通知与订单串联",
                            "value":  "3"
                        },
                        {
                            "label":  "待确认规则",
                            "note":  "回调字段口径",
                            "value":  "5"
                        },
                        {
                            "label":  "本周目标",
                            "note":  "减少订单链断裂",
                            "value":  "稳定回调链路"
                        }
                    ],
        "quickActions":  [
                             {
                                 "desc":  "聚焦 order_id、channel_order_id",
                                 "title":  "查看回调字段"
                             },
                             {
                                 "desc":  "进入验收与协作页看异常样本",
                                 "title":  "查看服务端日志"
                             },
                             {
                                 "desc":  "查看当前链路是否为新增或迁移",
                                 "title":  "确认版本差异"
                             }
                         ],
        "qa":  [
                   "哪些回调字段没有真实获取？",
                   "哪些服务端链路还没有纳入？"
               ],
        "taskMap":  [
                        "看回调",
                        "看规则",
                        "查异常",
                        "回写结论"
                    ]
    },
    {
        "id":  "ops",
        "label":  "运营",
        "onboarding":  "先看总览，再看和业务分析直接相关的链路。",
        "summary":  [
                        {
                            "label":  "当前待办",
                            "note":  "关注广告和投放分析支撑",
                            "value":  "3"
                        },
                        {
                            "label":  "P0 问题",
                            "note":  "广告与渠道字段为主",
                            "value":  "2"
                        },
                        {
                            "label":  "待确认规则",
                            "note":  "投放后才上报的项",
                            "value":  "4"
                        },
                        {
                            "label":  "本周目标",
                            "note":  "把漏项变成显式任务",
                            "value":  "明确广告专项待办"
                        }
                    ],
        "quickActions":  [
                             {
                                 "desc":  "看广告与渠道相关事件和字段",
                                 "title":  "查看广告链"
                             },
                             {
                                 "desc":  "快速理解异常影响",
                                 "title":  "查看知识链接"
                             },
                             {
                                 "desc":  "确认哪些问题影响业务决策",
                                 "title":  "查看报告"
                             }
                         ],
        "qa":  [
                   "当前广告相关字段缺口有哪些？",
                   "哪些项需要投放后专项验证？"
               ],
        "taskMap":  [
                        "看总览",
                        "看广告链",
                        "看报告",
                        "跟专项待办"
                    ]
    },
    {
        "id":  "pm",
        "label":  "项管",
        "onboarding":  "优先看问题总量、主链状态和本周目标。",
        "summary":  [
                        {
                            "label":  "当前待办",
                            "note":  "主要是会签与阻塞协调",
                            "value":  "5"
                        },
                        {
                            "label":  "P0 问题",
                            "note":  "围绕三条核心链路",
                            "value":  "12"
                        },
                        {
                            "label":  "待确认规则",
                            "note":  "需多角色共同拍板",
                            "value":  "18"
                        },
                        {
                            "label":  "本周目标",
                            "note":  "不扩边界先收主链",
                            "value":  "完成 P0 基线闭环"
                        }
                    ],
        "quickActions":  [
                             {
                                 "desc":  "看输入到沉淀是否顺畅",
                                 "title":  "查看主链状态"
                             },
                             {
                                 "desc":  "按责任方核对阻塞",
                                 "title":  "查看问题清单"
                             },
                             {
                                 "desc":  "确认本周是否需要补验",
                                 "title":  "查看版本差异"
                             }
                         ],
        "qa":  [
                   "当前最影响上线的是什么？",
                   "哪些问题还没有明确责任人？"
               ],
        "taskMap":  [
                        "看总览",
                        "看问题",
                        "看状态",
                        "看差异"
                    ]
    },
    {
        "id":  "qa",
        "label":  "QA",
        "onboarding":  "优先看验收与协作页和验收中心。",
        "summary":  [
                        {
                            "label":  "当前待办",
                            "note":  "自动校验后人工确认",
                            "value":  "9"
                        },
                        {
                            "label":  "P0 问题",
                            "note":  "支付链与透传链为主",
                            "value":  "7"
                        },
                        {
                            "label":  "待确认规则",
                            "note":  "例外与环境规则",
                            "value":  "10"
                        },
                        {
                            "label":  "本周目标",
                            "note":  "把结果转成问题和知识链接",
                            "value":  "完成首轮异常归类"
                        }
                    ],
        "quickActions":  [
                             {
                                 "desc":  "按严重度和责任建议排序",
                                 "title":  "查看异常清单"
                             },
                             {
                                 "desc":  "减少重复解释",
                                 "title":  "查看知识链接"
                             },
                             {
                                 "desc":  "同步当周验收结论",
                                 "title":  "导出角色化报告"
                             }
                         ],
        "qa":  [
                   "自动校验已经覆盖了哪些规则？",
                   "哪些异常需要人工灰区判断？"
               ],
        "taskMap":  [
                        "跑校验",
                        "看异常",
                        "查样本",
                        "做确认",
                        "出报告"
                    ]
    }
];
export const workbenchTasks = [
    {
        "id":  "wb-1",
        "title":  "确认新手引导链路基线",
        "owner":  "数分 / 游戏客户端",
        "status":  "待确认",
        "risk":  "高",
        "next":  "明确 TutorialStep 是否升级为必接",
        "context":  "当前文档同时存在推荐项、后端映射与步骤口径差异。",
        "impact":  "直接影响新手漏斗分析。",
        "deadline":  "2026-04-30",
        "blockers":  [
                         "推荐项未拍板",
                         "stepId 口径待确认"
                     ],
        "modules":  [
                        "文档基线",
                        "规则中心"
                    ],
        "aiTips":  [
                       "AI 已抽取 Tutorial 相关字段和灰区。"
                   ]
    },
    {
        "id":  "wb-2",
        "title":  "闭合支付订单字段链路",
        "owner":  "游戏服务端 / SDK服务端",
        "status":  "修复中",
        "risk":  "高",
        "next":  "确认 order_id 与 channel_order_id 获取策略",
        "context":  "支付链字段存在未获取和不发送标记。",
        "impact":  "影响支付漏斗、订单回查和收入归因。",
        "deadline":  "2026-04-30",
        "blockers":  [
                         "订单字段未获取",
                         "发货通知映射不完整"
                     ],
        "modules":  [
                        "规则中心",
                        "验收中心"
                    ],
        "aiTips":  [
                       "AI 建议把未获取字段全部列入待确认规则。"
                   ]
    },
    {
        "id":  "wb-3",
        "title":  "确认透传链路一致性",
        "owner":  "SDK客户端 / 游戏服务端",
        "status":  "开发中",
        "risk":  "中",
        "next":  "补 getTrackingInfo 到服务端关键链路验证",
        "context":  "cpsid/device_id/c_oneid/s_oneid 是当前分包分析底座。",
        "impact":  "影响渠道分包与设备串联。",
        "deadline":  "2026-05-02",
        "blockers":  [
                         "平台能力差异",
                         "服务端接收不一致"
                     ],
        "modules":  [
                        "文档基线",
                        "验收与协作"
                    ],
        "aiTips":  [
                       "AI 已识别透传链为独立专项。"
                   ]
    }
];
export const requirementSummary = [
    {
        "label":  "P0 业务问题数",
        "note":  "来自 04-16 会议与花花世界真实文档",
        "value":  "12"
    },
    {
        "label":  "AI 主链路步骤数",
        "note":  "输入 -\u003e 提炼 -\u003e 基线 -\u003e 规则 -\u003e 执行 -\u003e 总结 -\u003e 确认 -\u003e 沉淀",
        "value":  "8"
    },
    {
        "label":  "待确认规则数",
        "note":  "重点集中在支付、新手、透传三条链",
        "value":  "18"
    },
    {
        "label":  "当前周目标",
        "note":  "先把最小闭环跑通",
        "value":  "完成基线首轮确认"
    }
];
export const requirementRows = [
    {
        "id":  "req-1",
        "title":  "新手引导漏斗链路收口",
        "project":  "花花世界",
        "goal":  "确保 TutorialStep 与 Tutorial 后端映射稳定支持新手漏斗分析",
        "priority":  "P0",
        "status":  "待评审",
        "owner":  "数分 / 游戏客户端 / QA",
        "updatedAt":  "2026-04-22",
        "next":  "确认新手引导从推荐升级为项目级必接",
        "background":  "新手引导链路存在推荐项、后端映射和步骤口径不一致风险。",
        "profile":  [
                        "阶段：RM 版基线梳理",
                        "平台：Android / iOS / SDK",
                        "本期范围：新手引导步骤与映射事件",
                        "排除项：广告投放专项"
                    ],
        "scope":  [
                      "108 TutorialStep",
                      "20001 Tutorial 自定义事件",
                      "stepId / stepName / scene.tutorial"
                  ],
        "eventUsage":  "用于还原引导漏斗和关键流失步骤。",
        "fieldUsage":  "用于稳定描述步骤编号、步骤名称和引导场景。",
        "acceptanceUsage":  "确认事件完整上报、步骤顺序可比、口径无歧义。",
        "aiTips":  [
                       "AI 已识别 TutorialStep/Tutorial 双轨事件需合并看待。",
                       "AI 建议把推荐项改为显式确认项。"
                   ],
        "units":  [
                      "Android 官方包 / 新手链",
                      "iOS 官方包 / 新手链"
                  ]
    },
    {
        "id":  "req-2",
        "title":  "支付与订单关联链路校验",
        "project":  "花花世界",
        "goal":  "确保 PayFlow、发货通知与订单号链路可回查",
        "priority":  "P0",
        "status":  "开发中",
        "owner":  "游戏服务端 / SDK服务端 / QA",
        "updatedAt":  "2026-04-22",
        "next":  "确认 order_id、channel_order_id 未获取原因和替代方案",
        "background":  "支付链核心字段大量存在未获取和不发送标记。",
        "profile":  [
                        "阶段：支付链专项核对",
                        "平台：SDK / 服务端",
                        "本期范围：支付漏斗、订单关联、发货通知",
                        "后续：支付测试环境与生产环境分流"
                    ],
        "scope":  [
                      "106 PayFlow",
                      "221 PayFlow",
                      "205 Pay",
                      "order_id / channel_order_id / pay_channel"
                  ],
        "eventUsage":  "用于还原支付漏斗、支付成功和发货链路。",
        "fieldUsage":  "用于订单串联、支付渠道分析和异常回查。",
        "acceptanceUsage":  "确认订单号链不断裂、发货通知可追溯、例外项被显式记录。",
        "aiTips":  [
                       "AI 已标出未获取字段为一级风险。",
                       "AI 建议把未发送项全部进入待确认规则。"
                   ],
        "units":  [
                      "Android 官方包 / 支付链",
                      "Android 联运支付测试包 / 支付链"
                  ]
    },
    {
        "id":  "req-3",
        "title":  "渠道分包与设备透传一致性",
        "project":  "花花世界",
        "goal":  "确保 cpsid、device_id、c_oneid、s_oneid 在客户端到服务端稳定透传",
        "priority":  "P0",
        "status":  "修复中",
        "owner":  "SDK客户端 / SDK服务端 / 游戏服务端",
        "updatedAt":  "2026-04-22",
        "next":  "补充 getTrackingInfo 到服务端关键链路的验证",
        "background":  "渠道分包与设备标识是分包效果分析与服务端串联底座。",
        "profile":  [
                        "阶段：基础透传治理",
                        "平台：Android / iOS / SDK",
                        "本期范围：公共字段透传闭环",
                        "后续：广告投放链共享"
                    ],
        "scope":  [
                      "cpsid / device_id / c_oneid / s_oneid",
                      "getTrackingInfo",
                      "登录 / 创角 / 支付链"
                  ],
        "eventUsage":  "用于分包归因、设备去重和服务端上下文绑定。",
        "fieldUsage":  "用于统一客户端与服务端身份标识。",
        "acceptanceUsage":  "确认客户端获取、服务端接收和关键事件使用一致。",
        "aiTips":  [
                       "AI 建议把透传链路做成专项待办。",
                       "AI 建议按平台能力差异维护例外说明。"
                   ],
        "units":  [
                      "Android 官方包 / 基础链",
                      "微信小游戏包 / 基础链"
                  ]
    },
    {
        "id":  "req-4",
        "title":  "核心事件基线与版本差异梳理",
        "project":  "花花世界",
        "goal":  "把 231 条事件和 83 条字段整理为统一文档基线",
        "priority":  "P0",
        "status":  "待评审",
        "owner":  "数分 / 产品 / QA",
        "updatedAt":  "2026-04-23",
        "next":  "输出文档基线确认版",
        "background":  "当前事件、字段、核心事件拆解分散在多份 Excel 中。",
        "profile":  [
                        "输入源：RM 版 / 20241223 梳理 / SDK 行为日志表",
                        "目标：形成统一基线",
                        "后续：驱动规则生成"
                    ],
        "scope":  [
                      "事件总数 231",
                      "字段总数 83",
                      "核心事件字段明细 157"
                  ],
        "eventUsage":  "统一所有后续规则、校验、报告的上游真源。",
        "fieldUsage":  "统一字段命名、必传性和业务含义。",
        "acceptanceUsage":  "基线确认后方可进入自动规则和验收执行。",
        "aiTips":  [
                       "AI 可自动抽取事件、字段、版本差异和待确认项。"
                   ],
        "units":  [
                      "全项目 / 文档基线"
                  ]
    }
];
export const eventSummary = [
    {
        "label":  "事件总数",
        "note":  "全部来自花花世界 RM 版事件清单",
        "value":  "231"
    },
    {
        "label":  "必接事件",
        "note":  "当前基线纳入的一期优先事件",
        "value":  "34"
    },
    {
        "label":  "未实现/不发送",
        "note":  "需要进入规则灰区或例外确认",
        "value":  "2"
    },
    {
        "label":  "上报来源类型",
        "note":  "涵盖 SDK、研发前端、研发后端",
        "value":  "6"
    }
];
export const eventRows = [
    {
        "id":  "event-1",
        "eventId":  "111",
        "eventName":  "Startup",
        "cnName":  "SDK初始化",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "游戏侧调用SDK初始化时，SDK自动上报",
        "trigger":  "游戏侧调用SDK初始化时，SDK自动上报",
        "side":  "SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.initialize()",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-2",
        "eventId":  "114",
        "eventName":  "SDKLogin",
        "cnName":  "SDK登录",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "SDK初始化后，主动发起平台登录成功，SDK自动上报",
        "trigger":  "SDK初始化后，主动发起平台登录成功，SDK自动上报",
        "side":  "SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-3",
        "eventId":  "102",
        "eventName":  "GameLogin",
        "cnName":  "账号登录",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "游戏侧调用SDK登录时，SDK自动上报",
        "trigger":  "游戏侧调用SDK登录时，SDK自动上报",
        "side":  "SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"215\"，HYL:游戏侧调用SDK登录获得参数，服务端验签结果上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"账号验签\"",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、result"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.platform.login()",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-4",
        "eventId":  "104",
        "eventName":  "EnterGame",
        "cnName":  "角色登录",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "游戏侧调用SDK进入游戏时，SDK自动上报",
        "trigger":  "游戏侧调用SDK进入游戏时，SDK自动上报",
        "side":  "SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"203\"，HYL:游戏侧账号登录成功后，完成账号下角色登录上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色登录\""
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.platform.enterGame()",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-5",
        "eventId":  "105",
        "eventName":  "LevelUp",
        "cnName":  "角色升级",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "游戏侧调用SDK角色升级时，SDK自动上报",
        "trigger":  "游戏侧调用SDK角色升级时，SDK自动上报",
        "side":  "SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"206\"，HYL:游戏侧角色升级时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色升级\"",
                       "pre_lev：升级前角色等级"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.platform.levelUp()",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-6",
        "eventId":  "106",
        "eventName":  "PayFlow",
        "cnName":  "支付流程",
        "domain":  "支付链路",
        "tag":  "支付",
        "purpose":  "游戏侧\u0026SDK支付流程中，按支付漏斗需求通过SDK分别上报",
        "trigger":  "游戏侧\u0026SDK支付流程中，按支付漏斗需求通过SDK分别上报",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"221\"，HYL:游戏侧在支付流程中，按支付漏斗需求上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"支付流程\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "channel_order_id：充值商户订单号，即平台侧or渠道侧订单号，对应支付成功【发货通知：channelOrderId】",
                       "order_id：中台充值订单ID，即SDK充值订单号，对应支付成功【发货通知：orderId】",
                       "game_order_id：游戏内订单号，按游戏内逻辑生成的支付订单号",
                       "product_ID：支付内容产品标识",
                       "product_name：支付内容产品名称",
                       "pay_channel：充值渠道，对应支付成功【发货通知：payWay】",
                       "recharge_channel：支付方式，对应支付成功【发货通知：rechargeType】",
                       "currency：支付货币类型，如：CNY、USD、HKD、JPY等（ISO-4217标准）",
                       "currency_unit：支付货币单位：0=legalUnit=元单位，1=cent=分单位",
                       "amount：支付货币金额，法币单位×100，如：100 = 1.00元，299 = 2.99元"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、step_id、step_name、result、channel_order_id、order_id、game_order_id、product_ID、product_name、pay_channel、recharge_channel、currency、currency_unit、amount"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.analytics.track()，type = \"9\",\"event\": \"106\"",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-7",
        "eventId":  "107",
        "eventName":  "PreEvent",
        "cnName":  "前置事件",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "游戏侧启动登录加载流程中，按自定义step通过SDK进行上报",
        "trigger":  "游戏侧启动登录加载流程中，按自定义step通过SDK进行上报",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"1\"",
                       "extra：",
                       "stepId：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "stepName：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：type、stepId、stepName"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.analytics.track()，type = \"1\"",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-8",
        "eventId":  "108",
        "eventName":  "TutorialStep",
        "cnName":  "新手引导",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "游戏侧新手引导流程中，按自定义step通过SDK将进行上报",
        "trigger":  "游戏侧新手引导流程中，按自定义step通过SDK将进行上报",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"2\"",
                       "extra：",
                       "stepId：步骤ID，游戏内引导步骤编号",
                       "stepName：步骤名称，游戏内引导步骤名称"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：type、stepId、stepName"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.analytics.track()，type = \"2\"",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-9",
        "eventId":  "110",
        "eventName":  "AdVideo",
        "cnName":  "激励视频",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "参照【支付流程】，在激励视频业务中的流程通过SDK上报",
        "trigger":  "参照【支付流程】，在激励视频业务中的流程通过SDK上报",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"223\"，HYL:参照【支付流程】，在激励视频业务中的流程上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"激励视频\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "ad_sid：游戏侧激励视频流水号，参照支付订单号生成",
                       "reward_target：激励视频对应奖励目标，参照支付商品标识，\u003e\u003e点击查看：奖励目标\u003c\u003c"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、step_id、step_name、result、ad_sid、reward_target"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.analytics.track()，type = \"9\",\"event\": \"110\"",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-10",
        "eventId":  "214",
        "eventName":  "GameLoginCustome",
        "cnName":  "游戏账号登录",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "未使用GSSDK账号体系，登录时间上报",
        "trigger":  "未使用GSSDK账号体系，登录时间上报",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "否",
        "status":  "未实现",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "当前文档标记为不发送，需在规则中心确认为例外还是缺口。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：不发送",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-11",
        "eventId":  "215",
        "eventName":  "GameLoginSign",
        "cnName":  "账号验签结果",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "游戏侧调用SDK登录获得参数，服务端验签结果上报",
        "trigger":  "游戏侧调用SDK登录获得参数，服务端验签结果上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"215\"，HYL:游戏侧调用SDK登录获得参数，服务端验签结果上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"账号验签\"",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、result"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-12",
        "eventId":  "201",
        "eventName":  "GameLogin",
        "cnName":  "账号登录",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "游戏侧通过SDK登录参数验签，完成游戏内账号登录上报",
        "trigger":  "游戏侧通过SDK登录参数验签，完成游戏内账号登录上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"215\"，HYL:游戏侧调用SDK登录获得参数，服务端验签结果上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"账号验签\"",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、result"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-13",
        "eventId":  "203",
        "eventName":  "RoleLogin",
        "cnName":  "角色登录",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "游戏侧账号登录成功后，完成账号下角色登录上报",
        "trigger":  "游戏侧账号登录成功后，完成账号下角色登录上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"203\"，HYL:游戏侧账号登录成功后，完成账号下角色登录上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色登录\""
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-14",
        "eventId":  "204",
        "eventName":  "RoleLogout",
        "cnName":  "角色登出",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "游戏侧角色登出(登出标准自定义)时上报",
        "trigger":  "游戏侧角色登出(登出标准自定义)时上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"204\"，HYL:游戏侧角色登出(登出标准自定义)时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色登出\"",
                       "duration：在线时长(秒s)，玩家下线Logout时，统计的本次登录在线时长"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-15",
        "eventId":  "205",
        "eventName":  "Pay",
        "cnName":  "角色充值",
        "domain":  "支付链路",
        "tag":  "支付",
        "purpose":  "游戏侧完成角色支付发货流程时上报",
        "trigger":  "游戏侧完成角色支付发货流程时上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"221\"，HYL:游戏侧在支付流程中，按支付漏斗需求上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"支付流程\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "channel_order_id：充值商户订单号，即平台侧or渠道侧订单号，对应支付成功【发货通知：channelOrderId】",
                       "order_id：中台充值订单ID，即SDK充值订单号，对应支付成功【发货通知：orderId】",
                       "game_order_id：游戏内订单号，按游戏内逻辑生成的支付订单号",
                       "product_ID：支付内容产品标识",
                       "product_name：支付内容产品名称",
                       "pay_channel：充值渠道，对应支付成功【发货通知：payWay】",
                       "recharge_channel：支付方式，对应支付成功【发货通知：rechargeType】",
                       "currency：支付货币类型，如：CNY、USD、HKD、JPY等（ISO-4217标准）",
                       "currency_unit：支付货币单位：0=legalUnit=元单位，1=cent=分单位",
                       "amount：支付货币金额，法币单位×100，如：100 = 1.00元，299 = 2.99元"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、step_id、step_name、result、channel_order_id、order_id、game_order_id、product_ID、product_name、pay_channel、recharge_channel、currency、currency_unit、amount"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-16",
        "eventId":  "206",
        "eventName":  "LevelUp",
        "cnName":  "角色升级",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "游戏侧角色升级时上报",
        "trigger":  "游戏侧角色升级时上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"206\"，HYL:游戏侧角色升级时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色升级\"",
                       "pre_lev：升级前角色等级"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-17",
        "eventId":  "207",
        "eventName":  "CCU",
        "cnName":  "在线人数",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "按整0/5分固定5min间隔上报",
        "trigger":  "按整0/5分固定5min间隔上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"207\"，HYL:游戏各区服，按整0/5分固定5min间隔上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"在线人数\"",
                       "user_count：在线人数"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、user_count"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-18",
        "eventId":  "208",
        "eventName":  "Prop",
        "cnName":  "资源产销",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "游戏侧角色任意游戏资产变更时上报",
        "trigger":  "游戏侧角色任意游戏资产变更时上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-19",
        "eventId":  "219",
        "eventName":  "ChatLog",
        "cnName":  "聊天日志",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "玩家角色在游戏内聊天成功发送消息时上报",
        "trigger":  "玩家角色在游戏内聊天成功发送消息时上报",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "否",
        "status":  "未实现",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "当前文档标记为不发送，需在规则中心确认为例外还是缺口。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：不发送，未来考虑接入平台社交组件",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-20",
        "eventId":  "221",
        "eventName":  "PayFlow",
        "cnName":  "支付流程",
        "domain":  "支付链路",
        "tag":  "支付",
        "purpose":  "游戏侧在支付流程中，按支付漏斗需求上报",
        "trigger":  "游戏侧在支付流程中，按支付漏斗需求上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"221\"，HYL:游戏侧在支付流程中，按支付漏斗需求上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"支付流程\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "channel_order_id：充值商户订单号，即平台侧or渠道侧订单号，对应支付成功【发货通知：channelOrderId】",
                       "order_id：中台充值订单ID，即SDK充值订单号，对应支付成功【发货通知：orderId】",
                       "game_order_id：游戏内订单号，按游戏内逻辑生成的支付订单号",
                       "product_ID：支付内容产品标识",
                       "product_name：支付内容产品名称",
                       "pay_channel：充值渠道，对应支付成功【发货通知：payWay】",
                       "recharge_channel：支付方式，对应支付成功【发货通知：rechargeType】",
                       "currency：支付货币类型，如：CNY、USD、HKD、JPY等（ISO-4217标准）",
                       "currency_unit：支付货币单位：0=legalUnit=元单位，1=cent=分单位",
                       "amount：支付货币金额，法币单位×100，如：100 = 1.00元，299 = 2.99元"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、step_id、step_name、result、channel_order_id、order_id、game_order_id、product_ID、product_name、pay_channel、recharge_channel、currency、currency_unit、amount"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：与前端【106:支付流程-PayFlow】为同一业务的后端事件",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-21",
        "eventId":  "223",
        "eventName":  "AdVideo",
        "cnName":  "激励视频",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "参照【支付流程】，在激励视频业务中的流程上报",
        "trigger":  "参照【支付流程】，在激励视频业务中的流程上报",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"223\"，HYL:参照【支付流程】，在激励视频业务中的流程上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"激励视频\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "ad_sid：游戏侧激励视频流水号，参照支付订单号生成",
                       "reward_target：激励视频对应奖励目标，参照支付商品标识，\u003e\u003e点击查看：奖励目标\u003c\u003c"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time、step_id、step_name、result、ad_sid、reward_target"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：与前端【110:激励视频-AdVideo】为同一业务的后端事件",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-22",
        "eventId":  "\u003e 10000",
        "eventName":  "event_\u003e 10000",
        "cnName":  "自定义事件",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "研发/SDK",
        "priority":  "P1",
        "acceptance":  "否",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.analytics.track()，type = “0”,\"event\": \"20xxx\"",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-23",
        "eventId":  "20001",
        "eventName":  "custom_20001",
        "cnName":  "新手引导-Tutorial",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:新手引导环节开始\u0026完成，= Tutorial.id",
        "trigger":  "HYL:新手引导环节开始\u0026完成，= Tutorial.id",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10001：新手引导-Tutorial】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-24",
        "eventId":  "20002",
        "eventName":  "custom_20002",
        "cnName":  "玩家成长-PlayerGrow",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:玩家成长日志，包括：玩家/商店/种植物等成长",
        "trigger":  "HYL:玩家成长日志，包括：玩家/商店/种植物等成长",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10002：玩家成长-PlayerGrow】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-25",
        "eventId":  "20003",
        "eventName":  "custom_20003",
        "cnName":  "成长解锁-GrowUnlock",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:玩家成长解锁内容，包括：功能/种植物/花艺配方等",
        "trigger":  "HYL:玩家成长解锁内容，包括：功能/种植物/花艺配方等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10003：成长解锁-GrowUnlock】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-26",
        "eventId":  "20004",
        "eventName":  "custom_20004",
        "cnName":  "游戏货币-GameCurrency",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:游戏货币变更日志，参照【资源产销-Prop】",
        "trigger":  "HYL:游戏货币变更日志，参照【资源产销-Prop】",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10004：游戏货币-GameCurrency】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-27",
        "eventId":  "20005",
        "eventName":  "custom_20005",
        "cnName":  "资源存量-Inventory",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色下线后异步上报(与Logout同时)",
        "trigger":  "HYL:角色下线后异步上报(与Logout同时)",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10005：资源存量-Inventory】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-28",
        "eventId":  "20006",
        "eventName":  "custom_20006",
        "cnName":  "鲜花种植-Plant",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:鲜花种植相关操作日志，培育/种植/浇水/收获等",
        "trigger":  "HYL:鲜花种植相关操作日志，培育/种植/浇水/收获等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 原【10006：原料生产-Produce】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-29",
        "eventId":  "20007",
        "eventName":  "custom_20007",
        "cnName":  "花艺制作-FloralMake",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:花艺制作相关操作日志，制作\u0026收获等",
        "trigger":  "HYL:花艺制作相关操作日志，制作\u0026收获等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 原【10007：制作合成-Manufacture】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-30",
        "eventId":  "20008",
        "eventName":  "custom_20008",
        "cnName":  "花艺售卖-FloralSell",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:花艺售卖相关操作日志，上架/结算/下架等",
        "trigger":  "HYL:花艺售卖相关操作日志，上架/结算/下架等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 原【10024：自动贩卖-AutoSell】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-31",
        "eventId":  "20009",
        "eventName":  "custom_20009",
        "cnName":  "经营订单-OperateOrder",
        "domain":  "支付链路",
        "tag":  "支付",
        "purpose":  "HYL:经营订单相关操作日志，触发/交付/结算等",
        "trigger":  "HYL:经营订单相关操作日志，触发/交付/结算等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 原【10008：经营订单-OperateOrder】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-32",
        "eventId":  "20010",
        "eventName":  "custom_20010",
        "cnName":  "场景事件-SceneEvent",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:场景事件相关操作日志，触发/完成等",
        "trigger":  "HYL:场景事件相关操作日志，触发/完成等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 原【10009：游戏事件-GameEvent】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-33",
        "eventId":  "20011",
        "eventName":  "custom_20011",
        "cnName":  "剧情播放-GameStory",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:剧情播放相关操作日志，跳过/自动/回看等",
        "trigger":  "HYL:剧情播放相关操作日志，跳过/自动/回看等",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 原【10013：剧情播放-GameStory】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-34",
        "eventId":  "20012",
        "eventName":  "custom_20012",
        "cnName":  "任务成就-Task",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:任务成就相关操作日志，触发/领取/完成/交付等",
        "trigger":  "HYL:任务成就相关操作日志，触发/领取/完成/交付等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10014：任务成就-Task】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-35",
        "eventId":  "20013",
        "eventName":  "custom_20013",
        "cnName":  "分档奖励-RankReward",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:分档奖励相关操作日志，达成/领取等",
        "trigger":  "HYL:分档奖励相关操作日志，达成/领取等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 新增",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-36",
        "eventId":  "20014",
        "eventName":  "custom_20014",
        "cnName":  "玩家换装-PlayerAvatar",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:玩家换装相关操作日志，穿上/脱下/染色等",
        "trigger":  "HYL:玩家换装相关操作日志，穿上/脱下/染色等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10012：玩家换装-PlayerAvatar】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-37",
        "eventId":  "20015",
        "eventName":  "custom_20015",
        "cnName":  "场景布置-SceneLayout",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:场景布置相关操作日志，布置/移动/收回等",
        "trigger":  "HYL:场景布置相关操作日志，布置/移动/收回等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10011：场景布置-SceneLayout】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-38",
        "eventId":  "20016",
        "eventName":  "custom_20016",
        "cnName":  "社交系统-Social",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:社交好友相关操作日志，加好友/互助等",
        "trigger":  "HYL:社交好友相关操作日志，加好友/互助等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 原【10016：社交系统-Social】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-39",
        "eventId":  "20017",
        "eventName":  "custom_20017",
        "cnName":  "交易系统-Trade",
        "domain":  "广告链路",
        "tag":  "广告",
        "purpose":  "HYL:交易系统相关操作日志，寄售/购买等",
        "trigger":  "HYL:交易系统相关操作日志，寄售/购买等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10017：交易系统-Trade】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-40",
        "eventId":  "20018",
        "eventName":  "custom_20018",
        "cnName":  "玩家排行-GameRanking",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:玩家排行相关行为日志，排名变动/奖励领取等",
        "trigger":  "HYL:玩家排行相关行为日志，排名变动/奖励领取等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10031：玩家排行-GameRanking】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-41",
        "eventId":  "20019",
        "eventName":  "custom_20019",
        "cnName":  "公会系统-Guild",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:公会相关基础行为日志，建设/分享/兑换等",
        "trigger":  "HYL:公会相关基础行为日志，建设/分享/兑换等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 新增",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-42",
        "eventId":  "20020",
        "eventName":  "custom_20020",
        "cnName":  "公会竞赛-GuildLeague",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:公会竞赛相关行为日志，领取/升级/完成公会任务等",
        "trigger":  "HYL:公会竞赛相关行为日志，领取/升级/完成公会任务等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 新增",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-43",
        "eventId":  "20021",
        "eventName":  "custom_20021",
        "cnName":  "内嵌游戏-MiniGame",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:内嵌游戏相关操作日志，挑战/评分/结算等",
        "trigger":  "HYL:内嵌游戏相关操作日志，挑战/评分/结算等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10025：内嵌游戏-MiniGame】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-44",
        "eventId":  "20022",
        "eventName":  "custom_20022",
        "cnName":  "入口检测-LauchFrom",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:根据平台要求，针对特定入口激励类功能的行为日志",
        "trigger":  "HYL:根据平台要求，针对特定入口激励类功能的行为日志",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10033：入口检测-LauchFrom】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-45",
        "eventId":  "20023",
        "eventName":  "custom_20023",
        "cnName":  "平台特性-PlatformFeature",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:平台特性相关操作日志，触发/发起/完成/反馈等",
        "trigger":  "HYL:平台特性相关操作日志，触发/发起/完成/反馈等",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10028：平台特性-PlatformFeature】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-46",
        "eventId":  "20024",
        "eventName":  "custom_20024",
        "cnName":  "商品购买-GoodsPurchase",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:通用商店机制中，商品购买日志",
        "trigger":  "HYL:通用商店机制中，商品购买日志",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10030：商品购买-GoodsPurchase】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-47",
        "eventId":  "20025",
        "eventName":  "custom_20025",
        "cnName":  "扭蛋抽奖-Gacha",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:扭蛋抽奖相关行为日志，单抽/十连/保底等",
        "trigger":  "HYL:扭蛋抽奖相关行为日志，单抽/十连/保底等",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：¶¶¶¶¶ 新增",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-48",
        "eventId":  "20026",
        "eventName":  "custom_20026",
        "cnName":  "活动展示-OpActHUD",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:活动类HUD界面操作日志，弹出/打开/完成/关闭等",
        "trigger":  "HYL:活动类HUD界面操作日志，弹出/打开/完成/关闭等",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10029：活动展示-OpActHUD】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-49",
        "eventId":  "20027",
        "eventName":  "custom_20027",
        "cnName":  "运营活动-OpAct",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:运营活动相关操作日志，启用/完成/交付等(参考任务)",
        "trigger":  "HYL:运营活动相关操作日志，启用/完成/交付等(参考任务)",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：对应原【10027：运营活动-OpAct】",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-50",
        "eventId":  "20028",
        "eventName":  "event_20028",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-51",
        "eventId":  "20029",
        "eventName":  "event_20029",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-52",
        "eventId":  "20030",
        "eventName":  "event_20030",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-53",
        "eventId":  "……",
        "eventName":  "custom_……",
        "cnName":  "……",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "……",
        "trigger":  "……",
        "side":  "……",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-54",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-55",
        "eventId":  "stepId",
        "eventName":  "event_stepId",
        "cnName":  "stepName",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "SDK前置事件埋点",
        "trigger":  "SDK前置事件埋点",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.analytics.track()，type = \"1\"",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-56",
        "eventId":  "10",
        "eventName":  "event_10",
        "cnName":  "游戏启动",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:游戏启动，SDK初始化",
        "trigger":  "HYL:游戏启动，SDK初始化",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"2\"",
                       "extra：",
                       "stepId：步骤ID，游戏内引导步骤编号",
                       "stepName：步骤名称，游戏内引导步骤名称"
                   ],
        "rules":  [
                      "必填字段：type、stepId、stepName"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-57",
        "eventId":  "20",
        "eventName":  "event_20",
        "cnName":  "进入启动页",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:游戏Logo动画启动页",
        "trigger":  "HYL:游戏Logo动画启动页",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-58",
        "eventId":  "30",
        "eventName":  "event_30",
        "cnName":  "CDN下载开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:开始进行配置\u0026资源下载",
        "trigger":  "HYL:开始进行配置\u0026资源下载",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-59",
        "eventId":  "31",
        "eventName":  "event_31",
        "cnName":  "CDN下载失败",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:启动过程中任意位置下载失败(包括中断)，可重复",
        "trigger":  "HYL:启动过程中任意位置下载失败(包括中断)，可重复",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-60",
        "eventId":  "32",
        "eventName":  "event_32",
        "cnName":  "CDN下载重连",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:启动过程中下载失败/中断后重试/重连成功，可重复",
        "trigger":  "HYL:启动过程中下载失败/中断后重试/重连成功，可重复",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-61",
        "eventId":  "40",
        "eventName":  "event_40",
        "cnName":  "进入Loading界面",
        "domain":  "广告链路",
        "tag":  "广告",
        "purpose":  "HYL:进入启动Loading界面",
        "trigger":  "HYL:进入启动Loading界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-62",
        "eventId":  "50",
        "eventName":  "event_50",
        "cnName":  "SDK登录开始",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:SDK登录开始，调用Login接口",
        "trigger":  "HYL:SDK登录开始，调用Login接口",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-63",
        "eventId":  "51",
        "eventName":  "event_51",
        "cnName":  "SDK登录失败",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:SDK登录失败，Login接口回调失败",
        "trigger":  "HYL:SDK登录失败，Login接口回调失败",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-64",
        "eventId":  "60",
        "eventName":  "event_60",
        "cnName":  "SDK登录成功",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:SDK登录成功，Login接口回调成功",
        "trigger":  "HYL:SDK登录成功，Login接口回调成功",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-65",
        "eventId":  "70",
        "eventName":  "event_70",
        "cnName":  "CDN下载完成",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:CDN下载完成",
        "trigger":  "HYL:CDN下载完成",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-66",
        "eventId":  "80",
        "eventName":  "event_80",
        "cnName":  "场景加载完成，进入游戏",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:游戏场景加载完成，进入游戏",
        "trigger":  "HYL:游戏场景加载完成，进入游戏",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-67",
        "eventId":  "90",
        "eventName":  "event_90",
        "cnName":  "新手漫画剧情一",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:进入新手漫画剧情第一页",
        "trigger":  "HYL:进入新手漫画剧情第一页",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-68",
        "eventId":  "91",
        "eventName":  "event_91",
        "cnName":  "新手漫画剧情一·加速",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:进行漫画剧情第一页加速操作，多次操作则多次上报",
        "trigger":  "HYL:进行漫画剧情第一页加速操作，多次操作则多次上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-69",
        "eventId":  "100",
        "eventName":  "event_100",
        "cnName":  "新手漫画剧情二",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:进入新手漫画剧情第二页",
        "trigger":  "HYL:进入新手漫画剧情第二页",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-70",
        "eventId":  "101",
        "eventName":  "event_101",
        "cnName":  "新手漫画剧情二·加速",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:进行漫画剧情第二页加速操作，多次操作则多次上报",
        "trigger":  "HYL:进行漫画剧情第二页加速操作，多次操作则多次上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-71",
        "eventId":  "110",
        "eventName":  "event_110",
        "cnName":  "进入花灵选择界面",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:进入花灵选择界面",
        "trigger":  "HYL:进入花灵选择界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"9\"",
                       "event：= \"110\"，HYL:参照【支付流程】，在激励视频业务中的流程通过SDK上报",
                       "extra：",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "ad_sid：游戏侧激励视频流水号，参照支付订单号生成",
                       "reward_target：激励视频对应奖励目标，参照支付商品标识，\u003e\u003e点击查看：奖励目标\u003c\u003c"
                   ],
        "rules":  [
                      "必填字段：type、event、step_id、step_name、result、ad_sid、reward_target"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-72",
        "eventId":  "111",
        "eventName":  "event_111",
        "cnName":  "花灵选择切换",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:进行花灵切换操作，可进行记录，不需要重复上报",
        "trigger":  "HYL:进行花灵切换操作，可进行记录，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-73",
        "eventId":  "120",
        "eventName":  "event_120",
        "cnName":  "完成花灵选择",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成花灵选择，点击确认下一步",
        "trigger":  "HYL:完成花灵选择，点击确认下一步",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-74",
        "eventId":  "130",
        "eventName":  "event_130",
        "cnName":  "进入角色创建界面",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:进入角色创建界面",
        "trigger":  "HYL:进入角色创建界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-75",
        "eventId":  "131",
        "eventName":  "event_131",
        "cnName":  "角色昵称手动修改",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:手动输入修改角色昵称，不需要重复上报",
        "trigger":  "HYL:手动输入修改角色昵称，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-76",
        "eventId":  "132",
        "eventName":  "event_132",
        "cnName":  "玩家昵称随机修改",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:随用随机昵称进行昵称修改，不需要重复上报",
        "trigger":  "HYL:随用随机昵称进行昵称修改，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-77",
        "eventId":  "133",
        "eventName":  "event_133",
        "cnName":  "玩家昵称非法",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:昵称修改过程中出现昵称不可用提示，不需要重复上报",
        "trigger":  "HYL:昵称修改过程中出现昵称不可用提示，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-78",
        "eventId":  "134",
        "eventName":  "event_134",
        "cnName":  "玩家形象头饰编辑",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建过程中，进行头饰编辑操作，不需要重复上报",
        "trigger":  "HYL:角色创建过程中，进行头饰编辑操作，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-79",
        "eventId":  "135",
        "eventName":  "event_135",
        "cnName":  "玩家形象服饰编辑",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建过程中，进行服饰编辑操作，不需要重复上报",
        "trigger":  "HYL:角色创建过程中，进行服饰编辑操作，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-80",
        "eventId":  "136",
        "eventName":  "event_136",
        "cnName":  "玩家形象肤色编辑",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建过程中，进行肤色编辑操作，不需要重复上报",
        "trigger":  "HYL:角色创建过程中，进行肤色编辑操作，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-81",
        "eventId":  "137",
        "eventName":  "event_137",
        "cnName":  "玩家形象旋转角色",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建过程中，进行角色旋转操作，不需要重复上报",
        "trigger":  "HYL:角色创建过程中，进行角色旋转操作，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-82",
        "eventId":  "140",
        "eventName":  "event_140",
        "cnName":  "角色创建完成",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成角色创建，点击确认下一步",
        "trigger":  "HYL:完成角色创建，点击确认下一步",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-83",
        "eventId":  "150",
        "eventName":  "event_150",
        "cnName":  "隐私协议弹窗展示",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建开始前，隐私协议确认弹窗",
        "trigger":  "HYL:角色创建开始前，隐私协议确认弹窗",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-84",
        "eventId":  "151",
        "eventName":  "event_151",
        "cnName":  "隐私协议拒绝",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:隐私协议窗口，拒绝授权",
        "trigger":  "HYL:隐私协议窗口，拒绝授权",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-85",
        "eventId":  "160",
        "eventName":  "event_160",
        "cnName":  "隐私协议确认并关闭",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:隐私协议窗口，同意授权",
        "trigger":  "HYL:隐私协议窗口，同意授权",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-86",
        "eventId":  "170",
        "eventName":  "event_170",
        "cnName":  "花灵契约动画开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:进入花灵契约动画界面",
        "trigger":  "HYL:进入花灵契约动画界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-87",
        "eventId":  "171",
        "eventName":  "event_171",
        "cnName":  "花灵契约动画 · 加速",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:在花灵契约播放过程加速操作",
        "trigger":  "HYL:在花灵契约播放过程加速操作",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-88",
        "eventId":  "180",
        "eventName":  "event_180",
        "cnName":  "花灵契约对话开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:开始花灵契约对白",
        "trigger":  "HYL:开始花灵契约对白",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-89",
        "eventId":  "181",
        "eventName":  "event_181",
        "cnName":  "花灵契约对话 · 跳过",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:可进行跳过对话操作",
        "trigger":  "HYL:可进行跳过对话操作",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-90",
        "eventId":  "182",
        "eventName":  "event_182",
        "cnName":  "花灵契约对话 · 自动",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:可进行自动对话操作",
        "trigger":  "HYL:可进行自动对话操作",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-91",
        "eventId":  "190",
        "eventName":  "event_190",
        "cnName":  "花灵契约剧情结束",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:花灵契约剧情全部结束",
        "trigger":  "HYL:花灵契约剧情全部结束",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-92",
        "eventId":  "200",
        "eventName":  "event_200",
        "cnName":  "完成新手剧情，进入主场景",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:完成新手剧情及创角，进入主场景",
        "trigger":  "HYL:完成新手剧情及创角，进入主场景",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250122",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-93",
        "eventId":  "------ 2025.07 SPT 0.7.9 更新 step_version = 20250724 ------",
        "eventName":  "event_------ 2025.07 SPT 0.7.9 更新 step_version = 20250724 ------",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-94",
        "eventId":  "10",
        "eventName":  "event_10",
        "cnName":  "游戏启动",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:游戏启动，SDK初始化",
        "trigger":  "HYL:游戏启动，SDK初始化",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "10",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"2\"",
                       "extra：",
                       "stepId：步骤ID，游戏内引导步骤编号",
                       "stepName：步骤名称，游戏内引导步骤名称"
                   ],
        "rules":  [
                      "必填字段：type、stepId、stepName"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-95",
        "eventId":  "20",
        "eventName":  "event_20",
        "cnName":  "进入启动页",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:游戏Logo动画启动页",
        "trigger":  "HYL:游戏Logo动画启动页",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "20",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-96",
        "eventId":  "30",
        "eventName":  "event_30",
        "cnName":  "CDN下载开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:开始进行配置\u0026资源下载",
        "trigger":  "HYL:开始进行配置\u0026资源下载",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "30",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-97",
        "eventId":  "31",
        "eventName":  "event_31",
        "cnName":  "CDN下载失败",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:启动过程中任意位置下载失败(包括中断)，可重复",
        "trigger":  "HYL:启动过程中任意位置下载失败(包括中断)，可重复",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "31",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-98",
        "eventId":  "32",
        "eventName":  "event_32",
        "cnName":  "CDN下载重连",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:启动过程中下载失败/中断后重试/重连成功，可重复",
        "trigger":  "HYL:启动过程中下载失败/中断后重试/重连成功，可重复",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "32",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-99",
        "eventId":  "40",
        "eventName":  "event_40",
        "cnName":  "进入Loading界面",
        "domain":  "广告链路",
        "tag":  "广告",
        "purpose":  "HYL:进入启动Loading界面",
        "trigger":  "HYL:进入启动Loading界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "40",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-100",
        "eventId":  "100",
        "eventName":  "event_100",
        "cnName":  "SDK登录开始",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:SDK登录开始，调用Login接口",
        "trigger":  "HYL:SDK登录开始，调用Login接口",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "50",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-101",
        "eventId":  "101",
        "eventName":  "event_101",
        "cnName":  "SDK登录失败",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:SDK登录失败，Login接口回调失败",
        "trigger":  "HYL:SDK登录失败，Login接口回调失败",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "51",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-102",
        "eventId":  "102",
        "eventName":  "event_102",
        "cnName":  "SDK登录成功",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:SDK登录成功，Login接口回调成功",
        "trigger":  "HYL:SDK登录成功，Login接口回调成功",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "60",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-103",
        "eventId":  "110",
        "eventName":  "event_110",
        "cnName":  "SDK设备信息获取开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:SDK获取设备信息开始，调用getTrackingInfo接口",
        "trigger":  "HYL:SDK获取设备信息开始，调用getTrackingInfo接口",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"9\"",
                       "event：= \"110\"，HYL:参照【支付流程】，在激励视频业务中的流程通过SDK上报",
                       "extra：",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "ad_sid：游戏侧激励视频流水号，参照支付订单号生成",
                       "reward_target：激励视频对应奖励目标，参照支付商品标识，\u003e\u003e点击查看：奖励目标\u003c\u003c"
                   ],
        "rules":  [
                      "必填字段：type、event、step_id、step_name、result、ad_sid、reward_target"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-104",
        "eventId":  "111",
        "eventName":  "event_111",
        "cnName":  "SDK设备信息获取失败",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:SDK获取设备信息失败，getTrackingInfo接口回调失败",
        "trigger":  "HYL:SDK获取设备信息失败，getTrackingInfo接口回调失败",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-105",
        "eventId":  "112",
        "eventName":  "event_112",
        "cnName":  "SDK设备信息获取成功",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:SDK获取设备信息成功，getTrackingInfo接口回调成功",
        "trigger":  "HYL:SDK获取设备信息成功，getTrackingInfo接口回调成功",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-106",
        "eventId":  "120",
        "eventName":  "event_120",
        "cnName":  "请求服务器列表开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取SDK登录\u0026设备信息后，请求服务器列表并登录账号",
        "trigger":  "HYL:获取SDK登录\u0026设备信息后，请求服务器列表并登录账号",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-107",
        "eventId":  "121",
        "eventName":  "event_121",
        "cnName":  "请求服务器列表失败",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取SDK登录\u0026设备信息后，请求服务器列表\u0026登录失败",
        "trigger":  "HYL:获取SDK登录\u0026设备信息后，请求服务器列表\u0026登录失败",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-108",
        "eventId":  "122",
        "eventName":  "event_122",
        "cnName":  "服务器维护中",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取SDK登录\u0026设备信息后，请求登录返回服务器维护中",
        "trigger":  "HYL:获取SDK登录\u0026设备信息后，请求登录返回服务器维护中",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-109",
        "eventId":  "123",
        "eventName":  "event_123",
        "cnName":  "请求服务器列表成功",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取SDK登录\u0026设备信息后，请求服务器列表\u0026登录成功",
        "trigger":  "HYL:获取SDK登录\u0026设备信息后，请求服务器列表\u0026登录成功",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-110",
        "eventId":  "130",
        "eventName":  "event_130",
        "cnName":  "加载配置文件开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:根据服务器列表返回cfgVersion，开始加载在线配置文件",
        "trigger":  "HYL:根据服务器列表返回cfgVersion，开始加载在线配置文件",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-111",
        "eventId":  "131",
        "eventName":  "event_131",
        "cnName":  "加载配置文件失败",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:根据服务器列表返回cfgVersion，加载在线配置文件失败",
        "trigger":  "HYL:根据服务器列表返回cfgVersion，加载在线配置文件失败",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-112",
        "eventId":  "132",
        "eventName":  "event_132",
        "cnName":  "加载配置文件成功",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:根据服务器列表返回cfgVersion，加载在线配置文件成功",
        "trigger":  "HYL:根据服务器列表返回cfgVersion，加载在线配置文件成功",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-113",
        "eventId":  "140",
        "eventName":  "event_140",
        "cnName":  "获取网关地址开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:请求游戏服网关地址",
        "trigger":  "HYL:请求游戏服网关地址",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-114",
        "eventId":  "141",
        "eventName":  "event_141",
        "cnName":  "获取网关地址失败",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:请求游戏服网关地址失败",
        "trigger":  "HYL:请求游戏服网关地址失败",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-115",
        "eventId":  "142",
        "eventName":  "event_142",
        "cnName":  "获取网关地址成功",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:请求游戏服网关地址成功",
        "trigger":  "HYL:请求游戏服网关地址成功",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-116",
        "eventId":  "150",
        "eventName":  "event_150",
        "cnName":  "连接网络服务器开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:请求连接游戏网关服务器",
        "trigger":  "HYL:请求连接游戏网关服务器",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-117",
        "eventId":  "151",
        "eventName":  "event_151",
        "cnName":  "连接网络服务器失败",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:请求连接游戏网关服务器失败",
        "trigger":  "HYL:请求连接游戏网关服务器失败",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-118",
        "eventId":  "152",
        "eventName":  "event_152",
        "cnName":  "连接网络服务器成功",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:请求连接游戏网关服务器成功",
        "trigger":  "HYL:请求连接游戏网关服务器成功",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-119",
        "eventId":  "160",
        "eventName":  "event_160",
        "cnName":  "客户端角色登录开始",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:请求游戏服角色登录",
        "trigger":  "HYL:请求游戏服角色登录",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-120",
        "eventId":  "161",
        "eventName":  "event_161",
        "cnName":  "客户端角色登录失败",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:请求游戏服角色登录失败",
        "trigger":  "HYL:请求游戏服角色登录失败",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-121",
        "eventId":  "162",
        "eventName":  "event_162",
        "cnName":  "客户端角色登录成功",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:请求游戏服角色登录成功",
        "trigger":  "HYL:请求游戏服角色登录成功",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-122",
        "eventId":  "180",
        "eventName":  "event_180",
        "cnName":  "剧情资源预加载开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:开始预加载剧情资源",
        "trigger":  "HYL:开始预加载剧情资源",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-123",
        "eventId":  "182",
        "eventName":  "event_182",
        "cnName":  "剧情资源预加载完成",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:预加载剧情资源完成（不会失败）",
        "trigger":  "HYL:预加载剧情资源完成（不会失败）",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-124",
        "eventId":  "190",
        "eventName":  "event_190",
        "cnName":  "场景地块资源预加载开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:开始预加载场景地块资源",
        "trigger":  "HYL:开始预加载场景地块资源",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-125",
        "eventId":  "192",
        "eventName":  "event_192",
        "cnName":  "场景地块资源预加载完成",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:预加载场景地块资源完成（不会失败）",
        "trigger":  "HYL:预加载场景地块资源完成（不会失败）",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-126",
        "eventId":  "200",
        "eventName":  "event_200",
        "cnName":  "新手漫画剧情一",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:进入新手漫画剧情第一页",
        "trigger":  "HYL:进入新手漫画剧情第一页",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "90",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-127",
        "eventId":  "201",
        "eventName":  "event_201",
        "cnName":  "新手漫画剧情一·加速",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:进行漫画剧情第一页加速操作，多次操作则多次上报",
        "trigger":  "HYL:进行漫画剧情第一页加速操作，多次操作则多次上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "91",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"201\"，HYL:游戏侧通过SDK登录参数验签，完成游戏内账号登录上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"账号登录\""
                   ],
        "rules":  [
                      "必填字段：event_id、start_time"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-128",
        "eventId":  "202",
        "eventName":  "event_202",
        "cnName":  "新手漫画剧情二",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:进入新手漫画剧情第二页",
        "trigger":  "HYL:进入新手漫画剧情第二页",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "100",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-129",
        "eventId":  "203",
        "eventName":  "event_203",
        "cnName":  "新手漫画剧情二·加速",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:进行漫画剧情第二页加速操作，多次操作则多次上报",
        "trigger":  "HYL:进行漫画剧情第二页加速操作，多次操作则多次上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "101",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"203\"，HYL:游戏侧账号登录成功后，完成账号下角色登录上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色登录\""
                   ],
        "rules":  [
                      "必填字段：event_id、start_time"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-130",
        "eventId":  "210",
        "eventName":  "event_210",
        "cnName":  "创建场景UI开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:开始创建进入主场景所需UI",
        "trigger":  "HYL:开始创建进入主场景所需UI",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-131",
        "eventId":  "212",
        "eventName":  "event_212",
        "cnName":  "创建场景UI完成",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:创建进入主场景所需UI完成",
        "trigger":  "HYL:创建进入主场景所需UI完成",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-132",
        "eventId":  "220",
        "eventName":  "event_220",
        "cnName":  "CDN下载完成",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成进入游戏所需资源CDN下载",
        "trigger":  "HYL:完成进入游戏所需资源CDN下载",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "70",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-133",
        "eventId":  "230",
        "eventName":  "event_230",
        "cnName":  "获取服务器数据开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色登录成功后，开始接受角色数据并初始化游戏",
        "trigger":  "HYL:角色登录成功后，开始接受角色数据并初始化游戏",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-134",
        "eventId":  "231",
        "eventName":  "event_231",
        "cnName":  "加载主场景物件\u0026NPC·开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取角色场景数据后，开始加载主场景",
        "trigger":  "HYL:获取角色场景数据后，开始加载主场景",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-135",
        "eventId":  "232",
        "eventName":  "event_232",
        "cnName":  "加载主场景物件\u0026NPC·完成",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取角色场景数据后，加载主场景完成",
        "trigger":  "HYL:获取角色场景数据后，加载主场景完成",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-136",
        "eventId":  "233",
        "eventName":  "event_233",
        "cnName":  "加载玩家Avatar·开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取角色Avatar数据后，开始加载角色Avatar",
        "trigger":  "HYL:获取角色Avatar数据后，开始加载角色Avatar",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-137",
        "eventId":  "234",
        "eventName":  "event_234",
        "cnName":  "加载玩家Avatar·完成",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取角色Avatar数据后，加载角色Avatar完成",
        "trigger":  "HYL:获取角色Avatar数据后，加载角色Avatar完成",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-138",
        "eventId":  "235",
        "eventName":  "event_235",
        "cnName":  "加载主界面数据\u0026展示内容·开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取角色主界面功能数据后，开始加载主界面信息\u0026资源",
        "trigger":  "HYL:获取角色主界面功能数据后，开始加载主界面信息\u0026资源",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-139",
        "eventId":  "236",
        "eventName":  "event_236",
        "cnName":  "加载主界面数据\u0026展示内容·完成",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取角色主界面功能数据后，加载主界面信息完成",
        "trigger":  "HYL:获取角色主界面功能数据后，加载主界面信息完成",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-140",
        "eventId":  "237",
        "eventName":  "event_237",
        "cnName":  "加载其他角色数据相关内容·开始",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取角色各主要功能数据后，开始加载相关信息\u0026资源",
        "trigger":  "HYL:获取角色各主要功能数据后，开始加载相关信息\u0026资源",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-141",
        "eventId":  "238",
        "eventName":  "event_238",
        "cnName":  "加载其他角色数据相关内容·完成",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:获取角色各主要功能数据后，加载相关信息\u0026资源完成",
        "trigger":  "HYL:获取角色各主要功能数据后，加载相关信息\u0026资源完成",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "新增",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-142",
        "eventId":  "300",
        "eventName":  "event_300",
        "cnName":  "进入花灵选择界面",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:进入花灵选择界面",
        "trigger":  "HYL:进入花灵选择界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "110",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-143",
        "eventId":  "301",
        "eventName":  "event_301",
        "cnName":  "花灵选择切换",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:进行花灵切换操作，可进行记录，不需要重复上报",
        "trigger":  "HYL:进行花灵切换操作，可进行记录，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "111",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-144",
        "eventId":  "310",
        "eventName":  "event_310",
        "cnName":  "完成花灵选择",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成花灵选择，点击确认下一步",
        "trigger":  "HYL:完成花灵选择，点击确认下一步",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "120",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-145",
        "eventId":  "320",
        "eventName":  "event_320",
        "cnName":  "进入角色创建界面",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:进入角色创建界面",
        "trigger":  "HYL:进入角色创建界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "130",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-146",
        "eventId":  "321",
        "eventName":  "event_321",
        "cnName":  "角色昵称手动修改",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:手动输入修改角色昵称，不需要重复上报",
        "trigger":  "HYL:手动输入修改角色昵称，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "131",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-147",
        "eventId":  "322",
        "eventName":  "event_322",
        "cnName":  "玩家昵称随机修改",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:随用随机昵称进行昵称修改，不需要重复上报",
        "trigger":  "HYL:随用随机昵称进行昵称修改，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "132",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-148",
        "eventId":  "323",
        "eventName":  "event_323",
        "cnName":  "玩家昵称非法",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:昵称修改过程中出现昵称不可用提示，不需要重复上报",
        "trigger":  "HYL:昵称修改过程中出现昵称不可用提示，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "133",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-149",
        "eventId":  "324",
        "eventName":  "event_324",
        "cnName":  "玩家形象头饰编辑",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建过程中，进行头饰编辑操作，不需要重复上报",
        "trigger":  "HYL:角色创建过程中，进行头饰编辑操作，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "134",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-150",
        "eventId":  "325",
        "eventName":  "event_325",
        "cnName":  "玩家形象服饰编辑",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建过程中，进行服饰编辑操作，不需要重复上报",
        "trigger":  "HYL:角色创建过程中，进行服饰编辑操作，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "135",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-151",
        "eventId":  "326",
        "eventName":  "event_326",
        "cnName":  "玩家形象肤色编辑",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建过程中，进行肤色编辑操作，不需要重复上报",
        "trigger":  "HYL:角色创建过程中，进行肤色编辑操作，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "136",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-152",
        "eventId":  "327",
        "eventName":  "event_327",
        "cnName":  "玩家形象旋转角色",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建过程中，进行角色旋转操作，不需要重复上报",
        "trigger":  "HYL:角色创建过程中，进行角色旋转操作，不需要重复上报",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "137",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-153",
        "eventId":  "330",
        "eventName":  "event_330",
        "cnName":  "角色创建完成",
        "domain":  "基础链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成角色创建，点击确认下一步",
        "trigger":  "HYL:完成角色创建，点击确认下一步",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "140",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-154",
        "eventId":  "340",
        "eventName":  "event_340",
        "cnName":  "隐私协议弹窗展示",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:角色创建开始前，隐私协议确认弹窗",
        "trigger":  "HYL:角色创建开始前，隐私协议确认弹窗",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "150",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-155",
        "eventId":  "341",
        "eventName":  "event_341",
        "cnName":  "隐私协议拒绝",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:隐私协议窗口，拒绝授权",
        "trigger":  "HYL:隐私协议窗口，拒绝授权",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "151",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-156",
        "eventId":  "342",
        "eventName":  "event_342",
        "cnName":  "隐私协议确认并关闭",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:隐私协议窗口，同意授权",
        "trigger":  "HYL:隐私协议窗口，同意授权",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "160",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-157",
        "eventId":  "350",
        "eventName":  "event_350",
        "cnName":  "花灵契约动画开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:进入花灵契约动画界面",
        "trigger":  "HYL:进入花灵契约动画界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "170",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-158",
        "eventId":  "351",
        "eventName":  "event_351",
        "cnName":  "花灵契约动画 · 加速",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:在花灵契约播放过程加速操作",
        "trigger":  "HYL:在花灵契约播放过程加速操作",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "171",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-159",
        "eventId":  "360",
        "eventName":  "event_360",
        "cnName":  "花灵契约对话开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:开始花灵契约对白",
        "trigger":  "HYL:开始花灵契约对白",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "180",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-160",
        "eventId":  "361",
        "eventName":  "event_361",
        "cnName":  "花灵契约对话 · 跳过",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:可进行跳过对话操作",
        "trigger":  "HYL:可进行跳过对话操作",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "181",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-161",
        "eventId":  "362",
        "eventName":  "event_362",
        "cnName":  "花灵契约对话 · 自动",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:可进行自动对话操作",
        "trigger":  "HYL:可进行自动对话操作",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "182",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-162",
        "eventId":  "370",
        "eventName":  "event_370",
        "cnName":  "花灵契约剧情结束",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:花灵契约剧情全部结束",
        "trigger":  "HYL:花灵契约剧情全部结束",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "190",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-163",
        "eventId":  "380",
        "eventName":  "event_380",
        "cnName":  "完成新手剧情，进入主场景",
        "domain":  "新手链路",
        "tag":  "新手",
        "purpose":  "HYL:完成新手剧情及创角，进入主场景",
        "trigger":  "HYL:完成新手剧情及创角，进入主场景",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "200",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-164",
        "eventId":  "400",
        "eventName":  "event_400",
        "cnName":  "场景加载完成，进入游戏",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:非新手玩家，完成前置流程，进入主场景",
        "trigger":  "HYL:非新手玩家，完成前置流程，进入主场景",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "80",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20250724",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-165",
        "eventId":  "------ 2026.02 SPT 0.8.6 更新 step_version = 20260210 ------",
        "eventName":  "event_------ 2026.02 SPT 0.8.6 更新 step_version = 20260210 ------",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-166",
        "eventId":  "10",
        "eventName":  "event_10",
        "cnName":  "游戏启动",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:游戏启动，SDK初始化",
        "trigger":  "HYL:游戏启动，SDK初始化",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"2\"",
                       "extra：",
                       "stepId：步骤ID，游戏内引导步骤编号",
                       "stepName：步骤名称，游戏内引导步骤名称"
                   ],
        "rules":  [
                      "必填字段：type、stepId、stepName"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-167",
        "eventId":  "20",
        "eventName":  "event_20",
        "cnName":  "进入启动页",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:游戏Logo动画启动页",
        "trigger":  "HYL:游戏Logo动画启动页",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-168",
        "eventId":  "30",
        "eventName":  "event_30",
        "cnName":  "CDN下载开始",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:开始进行配置\u0026资源下载",
        "trigger":  "HYL:开始进行配置\u0026资源下载",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-169",
        "eventId":  "31",
        "eventName":  "event_31",
        "cnName":  "CDN下载失败",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:启动过程中任意位置下载失败(包括中断)，可重复",
        "trigger":  "HYL:启动过程中任意位置下载失败(包括中断)，可重复",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-170",
        "eventId":  "32",
        "eventName":  "event_32",
        "cnName":  "CDN下载重连",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:启动过程中下载失败/中断后重试/重连成功，可重复",
        "trigger":  "HYL:启动过程中下载失败/中断后重试/重连成功，可重复",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-171",
        "eventId":  "40",
        "eventName":  "event_40",
        "cnName":  "进入Loading界面",
        "domain":  "广告链路",
        "tag":  "广告",
        "purpose":  "HYL:进入启动Loading界面",
        "trigger":  "HYL:进入启动Loading界面",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-172",
        "eventId":  "100",
        "eventName":  "event_100",
        "cnName":  "SDK登录开始",
        "domain":  "基础链路",
        "tag":  "登录",
        "purpose":  "HYL:SDK登录开始，调用Login接口",
        "trigger":  "HYL:SDK登录开始，调用Login接口",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-173",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-174",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-175",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-176",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-177",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-178",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-179",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-180",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-181",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-182",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-183",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-184",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-185",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-186",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-187",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-188",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-189",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-190",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-191",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-192",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-193",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-194",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-195",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-196",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-197",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-198",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-199",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-200",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-201",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-202",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-203",
        "eventId":  "400",
        "eventName":  "event_400",
        "cnName":  "场景加载完成，进入游戏",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:非新手玩家，完成前置流程，进入主场景",
        "trigger":  "HYL:非新手玩家，完成前置流程，进入主场景",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：step_version = 20260210",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-204",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-205",
        "eventId":  "step_id",
        "eventName":  "event_step_id",
        "cnName":  "step_name",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "221:支付流程-PayFlow，埋点",
        "trigger":  "221:支付流程-PayFlow，埋点",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.analytics.track()，type = \"9\",\"event\": \"106\"",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-206",
        "eventId":  "201",
        "eventName":  "event_201",
        "cnName":  "HC_OPEN_PAY_INFO",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:特权详情页、支付礼包打开时发送",
        "trigger":  "HYL:特权详情页、支付礼包打开时发送",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"201\"，HYL:游戏侧通过SDK登录参数验签，完成游戏内账号登录上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"账号登录\""
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。",
                      "必填字段：event_id、start_time"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：展示支付内容",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-207",
        "eventId":  "302",
        "eventName":  "event_302",
        "cnName":  "HC_CLICK_PAY_BUTTON",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:任意支付商品点击购买按钮时发送（不论前置判断逻辑）",
        "trigger":  "HYL:任意支付商品点击购买按钮时发送（不论前置判断逻辑）",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：点击支付按钮",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-208",
        "eventId":  "401",
        "eventName":  "event_401",
        "cnName":  "HC_REQUEST_PAY_GOODS",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:点击支付购买按钮并通过前端前置判断，向后端请求",
        "trigger":  "HYL:点击支付购买按钮并通过前端前置判断，向后端请求",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：发起购买请求",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-209",
        "eventId":  "402",
        "eventName":  "event_402",
        "cnName":  "HS_RECIEVE_PAY_GOODS",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:收到前端支付购买请求（不论购买判断逻辑）",
        "trigger":  "HYL:收到前端支付购买请求（不论购买判断逻辑）",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：收到购买请求",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-210",
        "eventId":  "501",
        "eventName":  "event_501",
        "cnName":  "HS_RETURN_PAYMENT_PARAMS",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:执行购买校验判断，回传客户端校验结果（含支付参数）",
        "trigger":  "HYL:执行购买校验判断，回传客户端校验结果（含支付参数）",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：返回支付参数（或购买失败）",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-211",
        "eventId":  "502",
        "eventName":  "event_502",
        "cnName":  "HC_RECIEVE_PAYMENT_PARAMS",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:收到后端返回购买校验结果（含支付参数）",
        "trigger":  "HYL:收到后端返回购买校验结果（含支付参数）",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：收到支付参数（或购买失败）",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-212",
        "eventId":  "601",
        "eventName":  "event_601",
        "cnName":  "HC_CALL_SDK_PAYMENT",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成支付参数核对，调用SDK支付接口正式发起支付",
        "trigger":  "HYL:完成支付参数核对，调用SDK支付接口正式发起支付",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：发起SDK支付",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-213",
        "eventId":  "1302/2702",
        "eventName":  "event_1302/2702",
        "cnName":  "HS_RECIEVE_DELIVER_NOTIFY",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:收到SDK服务端的支付成功发货通知",
        "trigger":  "HYL:收到SDK服务端的支付成功发货通知",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：收到发货通知 (抖音+微信android/微信iOS)",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-214",
        "eventId":  "1402/2802",
        "eventName":  "event_1402/2802",
        "cnName":  "HS_COMPLETE_DELIVER",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:执行发货逻辑，完成发货操作",
        "trigger":  "HYL:执行发货逻辑，完成发货操作",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：完成发货操作 (抖音+微信android/微信iOS)，同时发送【205:角色充值-Pay；208:资源产销-Prop】事件",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-215",
        "eventId":  "1501/2901",
        "eventName":  "event_1501/2901",
        "cnName":  "HS_RETURN_DELIVER_RESULT",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:返回SDK服务端，游戏内发货执行结果",
        "trigger":  "HYL:返回SDK服务端，游戏内发货执行结果",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：返回发货结果 (抖音+微信android/微信iOS)",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-216",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-217",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-218",
        "eventId":  "step_id",
        "eventName":  "event_step_id",
        "cnName":  "step_name",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "223:激励视频-AdVideo，埋点",
        "trigger":  "223:激励视频-AdVideo，埋点",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：GSSdk.analytics.track()，type = \"9\",\"event\": \"110\"",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-219",
        "eventId":  "10201",
        "eventName":  "event_10201",
        "cnName":  "激励视频提示触发",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:用户基础操作，触发激励视频提示弹窗",
        "trigger":  "HYL:用户基础操作，触发激励视频提示弹窗",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= OpenAdVideoPrompt",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-220",
        "eventId":  "10302",
        "eventName":  "event_10302",
        "cnName":  "激励视频播放点击",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:用户点击激励视频播放按钮（不论前置判断逻辑）",
        "trigger":  "HYL:用户点击激励视频播放按钮（不论前置判断逻辑）",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= ClickAdVideoButton",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-221",
        "eventId":  "10401",
        "eventName":  "event_10401",
        "cnName":  "发起视频播放请求",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:点击播放且通过前端前置判断，向后端请求",
        "trigger":  "HYL:点击播放且通过前端前置判断，向后端请求",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= RequestAdVideoPlay",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-222",
        "eventId":  "10402",
        "eventName":  "event_10402",
        "cnName":  "收到视频播放请求",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:收到前端播放激励视频请求（不论后端校验逻辑）",
        "trigger":  "HYL:收到前端播放激励视频请求（不论后端校验逻辑）",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= ReceiveAdVideoPlay",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-223",
        "eventId":  "10501",
        "eventName":  "event_10501",
        "cnName":  "返回激励视频参数",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成播放校验，回传客户端校验结果（含播放参数）",
        "trigger":  "HYL:完成播放校验，回传客户端校验结果（含播放参数）",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= ReturnAdVideoParams",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-224",
        "eventId":  "10502",
        "eventName":  "event_10502",
        "cnName":  "收到激励视频参数",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:收到后端返回激励视频校验结果（含播放参数）",
        "trigger":  "HYL:收到后端返回激励视频校验结果（含播放参数）",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= ReceiveAdVideoParams",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-225",
        "eventId":  "10601",
        "eventName":  "event_10601",
        "cnName":  "发起SDK激励视频",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成激励视频参数核对，调用SDK激励视频接口",
        "trigger":  "HYL:完成激励视频参数核对，调用SDK激励视频接口",
        "side":  "研发-前端/SDK",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= CallSdkAdVideo",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-226",
        "eventId":  "20102",
        "eventName":  "event_20102",
        "cnName":  "监听激励视频结果",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:监听获得SDK返回激励视频播放结果",
        "trigger":  "HYL:监听获得SDK返回激励视频播放结果",
        "side":  "研发-前端/SDK",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= OnAdVideoResult",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-227",
        "eventId":  "20201",
        "eventName":  "event_20201",
        "cnName":  "返回视频奖励结果",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:回传后端激励视频结果",
        "trigger":  "HYL:回传后端激励视频结果",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= ReturnAdVideoResult",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-228",
        "eventId":  "20202",
        "eventName":  "event_20202",
        "cnName":  "收到视频奖励结果",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:收到前端回传激励视频结果",
        "trigger":  "HYL:收到前端回传激励视频结果",
        "side":  "研发-后端",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "待从字段基线和版本差异中补充规则。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= ReceiveAdVideoResult",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-229",
        "eventId":  "20302",
        "eventName":  "event_20302",
        "cnName":  "完成视频奖励发放",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "HYL:完成激励视频奖励发放（如成功）",
        "trigger":  "HYL:完成激励视频奖励发放（如成功）",
        "side":  "研发-后端",
        "priority":  "P0",
        "acceptance":  "是",
        "status":  "已纳入基线",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "rules":  [
                      "该事件纳入当前基线，默认参与一期验收。"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "备注：= CompleteAdVideoReward，同时发送【208:资源产销-Prop】事件",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-230",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    },
    {
        "id":  "event-231",
        "eventId":  "",
        "eventName":  "event_",
        "cnName":  "",
        "domain":  "自定义链路",
        "tag":  "自定义",
        "purpose":  "",
        "trigger":  "",
        "side":  "",
        "priority":  "P1",
        "acceptance":  "",
        "status":  "候选",
        "updatedAt":  "2025-12-22",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "rules":  [
                      "必填字段：event_id、start_time、item_consumetype、scene、item_type、item_id、item_name、item_num、left_num"
                  ],
        "history":  [
                        "来源文档：花花世界 RM 版 V251222",
                        "后续版本差异需在版本治理页继续确认。"
                    ],
        "aiTips":  [
                       "AI 建议先按当前基线确认是否属于标准事件还是项目自定义事件。",
                       "AI 建议把备注中的未发送/推荐信息转成待确认规则或例外项。"
                   ]
    }
];
export const fieldSummary = [
    {
        "label":  "字段总数",
        "note":  "来自字段说明清单",
        "value":  "83"
    },
    {
        "label":  "必传字段",
        "note":  "需要优先进入规则中心",
        "value":  "43"
    },
    {
        "label":  "关联核心事件字段",
        "note":  "核心事件字段明细可直接支撑规则草稿",
        "value":  "157"
    },
    {
        "label":  "高风险字段",
        "note":  "需要人工确认",
        "value":  "15"
    }
];
export const fieldRows = [
    {
        "id":  "field-1",
        "name":  "s_oneid",
        "cnName":  "服务端设备标识",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "客户端 透传参数",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "服务端设备标识",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "来源说明：GSSdk.analytics.getTrackingInfo()  返回信息"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-2",
        "name":  "c_oneid",
        "cnName":  "客户端设备标识",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "客户端设备标识",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-3",
        "name":  "device_id",
        "cnName":  "设备ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "设备ID",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-4",
        "name":  "cpsid",
        "cnName":  "渠道分包ID",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "渠道分包ID",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-5",
        "name":  "channel",
        "cnName":  "用户渠道",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "用户渠道",
        "sample":  "221事件【发货通知：channelId】",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：221事件【发货通知：channelId】"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-6",
        "name":  "os_type",
        "cnName":  "操作系统",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "操作系统",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-7",
        "name":  "language",
        "cnName":  "语言",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "语言",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-8",
        "name":  "app_package_name",
        "cnName":  "APP包体名称",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "APP包体名称",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-9",
        "name":  "device_model",
        "cnName":  "设备型号",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "设备型号",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-10",
        "name":  "os_version",
        "cnName":  "操作系统版本",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "操作系统版本",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-11",
        "name":  "app_version",
        "cnName":  "APP版本",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "APP版本",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-12",
        "name":  "app_version_code",
        "cnName":  "APP版本CODE",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "APP版本CODE",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-13",
        "name":  "open_id",
        "cnName":  "微信OpenId",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "微信OpenId",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-14",
        "name":  "union_id",
        "cnName":  "微信UnionId",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "微信UnionId",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-15",
        "name":  "login_from",
        "cnName":  "小游戏打开来源",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "小游戏打开来源",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-16",
        "name":  "h5_param",
        "cnName":  "H5参数？",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "H5参数？",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-17",
        "name":  "user_id",
        "cnName":  "GSSDK账号ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "GSSDK账号ID",
        "sample":  "221事件【发货通知：userId】",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：221事件【发货通知：userId】",
                      "来源说明：SDK登录返回：userId"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-18",
        "name":  "yoka_id",
        "cnName":  "渠道侧用户ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "渠道侧用户ID",
        "sample":  "221事件【发货通知：userName】",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：221事件【发货通知：userName】",
                      "来源说明：SDK登录返回：userName"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-19",
        "name":  "game_uuid",
        "cnName":  "数据唯一ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "服务端 公共参数",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "数据唯一ID",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "来源说明：数据唯一标识，时间戳 + 流水号"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-20",
        "name":  "app_id",
        "cnName":  "项目ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "项目ID",
        "sample":  "221事件【默认\"10100057\"】",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：221事件【默认\"10100057\"】",
                      "来源说明：数据中心登记的项目ID，10100057"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-21",
        "name":  "ip",
        "cnName":  "玩家IP",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "玩家IP",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "来源说明：玩家IP地址，非服务器IP地址"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-22",
        "name":  "role_id",
        "cnName":  "角色ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "角色ID",
        "sample":  "221事件【发货通知：roleId】",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：221事件【发货通知：roleId】",
                      "来源说明：玩家角色ID"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-23",
        "name":  "role_name",
        "cnName":  "角色昵称",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "角色昵称",
        "sample":  "221事件【发货通知：roleName】",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：221事件【发货通知：roleName】",
                      "来源说明：玩家角色昵称"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-24",
        "name":  "user_lev",
        "cnName":  "角色等级",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "角色等级",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "来源说明：玩家角色等级"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-25",
        "name":  "vip_lev",
        "cnName":  "角色VIP等级",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "角色VIP等级",
        "sample":  "221事件【默认\"0\"】",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：221事件【默认\"0\"】",
                      "来源说明：玩家角色VIP等级，暂无，默认\"0\""
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-26",
        "name":  "server_zone",
        "cnName":  "游戏服时区",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "游戏服时区",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "来源说明：玩家所在游戏服时区"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-27",
        "name":  "server",
        "cnName":  "创角区服ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "创角区服ID",
        "sample":  "221事件【发货通知：serverId】",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：221事件【发货通知：serverId】",
                      "来源说明：玩家创角所在区服"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-28",
        "name":  "realserver",
        "cnName":  "当前区服ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "当前区服ID",
        "sample":  "见原始文档",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "来源说明：玩家角色当前所在区服（合服/迁移后区服）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-29",
        "name":  "reg_time",
        "cnName":  "创角时间",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "创角时间",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "来源说明：玩家创角时间戳"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-30",
        "name":  "$param_xxx",
        "cnName":  "xxx",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "xxx",
        "sample":  "自定义公共参数",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：自定义公共参数",
                      "来源说明：xxxxx"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-31",
        "name":  "event_id",
        "cnName":  "事件ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "服务端 事件参数",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "事件ID",
        "sample":  "通用参数，全事件必须",
        "risk":  "中",
        "events":  [
                       "221 - 支付流程 PayFlow",
                       "223 - 激励视频 AdVideo",
                       "215 - 账号验签 GameLoginSign",
                       "201 - 账号登录 GameLogin",
                       "203 - 角色登录 RoleLogin",
                       "204 - 角色登出 RoleLogout",
                       "205 - 角色充值 Pay",
                       "206 - 角色升级 LevelUp",
                       "207 - 在线人数 CCU",
                       "208 - 资源产销 Prop"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：通用参数，全事件必须",
                      "来源说明：事件数据关联事件ID，详见【事件列表】"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-32",
        "name":  "start_time",
        "cnName":  "事件发生时间",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "事件发生时间",
        "sample":  "通用参数，全事件必须",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：通用参数，全事件必须",
                      "来源说明：事件数据产生时间戳"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-33",
        "name":  "event_name",
        "cnName":  "事件名称",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "事件名称",
        "sample":  "已废弃发送",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：已废弃发送",
                      "来源说明：事件名称文本，中文字符"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-34",
        "name":  "result",
        "cnName":  "事件结果",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "事件结果",
        "sample":  "应用事件：215，221，223",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：215，221，223",
                      "来源说明：成功：1；失败：0"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-35",
        "name":  "job_id",
        "cnName":  "职业ID",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "职业ID",
        "sample":  "应用事件：203；不发送：当前游戏无此信息",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：203；不发送：当前游戏无此信息",
                      "来源说明：暂无"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-36",
        "name":  "zhanli",
        "cnName":  "角色战力",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "角色战力",
        "sample":  "应用事件：203，204，206；不发送：当前游戏无此信息",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：203，204，206；不发送：当前游戏无此信息",
                      "来源说明：暂无"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-37",
        "name":  "gold1",
        "cnName":  "角色一级货币",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "角色一级货币",
        "sample":  "应用事件：203，204",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：203，204",
                      "来源说明：玩家角色拥有钻石数量，Item.id = 20002002"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-38",
        "name":  "gold2",
        "cnName":  "角色二级货币",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "角色二级货币",
        "sample":  "应用事件：203，204",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：203，204",
                      "来源说明：玩家角色拥有金币数量，Item.id = 20002001"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-39",
        "name":  "gold3",
        "cnName":  "角色三级货币",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "角色三级货币",
        "sample":  "应用事件：203，204；不发送：当前游戏无此信息",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：203，204；不发送：当前游戏无此信息",
                      "来源说明：暂无"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-40",
        "name":  "club_id",
        "cnName":  "公会ID",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "公会ID",
        "sample":  "应用事件：203，204；不发送：当前游戏无此信息",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：203，204；不发送：当前游戏无此信息",
                      "来源说明：暂无"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-41",
        "name":  "duration",
        "cnName":  "在线时长",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "在线时长",
        "sample":  "应用事件：204",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：204",
                      "来源说明：玩家下线Logout时，统计的本次登录在线时长"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-42",
        "name":  "channel_order_id",
        "cnName":  "充值商户订单号",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "充值商户订单号",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221",
                      "来源说明：平台/商户侧订单编号"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-43",
        "name":  "order_id",
        "cnName":  "充值订单ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "充值订单ID",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221",
                      "来源说明：支付中心订单编号"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-44",
        "name":  "product_ID",
        "cnName":  "购买道具ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "购买道具ID",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221",
                      "来源说明：购买道具ID（充值直购）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-45",
        "name":  "product_name",
        "cnName":  "购买道具名称",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "购买道具名称",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221",
                      "来源说明：购买道具名称（充值直购）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-46",
        "name":  "sku",
        "cnName":  "苹果商店商品",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "苹果商店商品",
        "sample":  "应用事件：205；不发送：合并于product_ID",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：205；不发送：合并于product_ID",
                      "来源说明：appstore SKU"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-47",
        "name":  "pay_channel",
        "cnName":  "充值渠道",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "充值渠道",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221",
                      "来源说明：用户充值渠道（例如官网充值、小程序充值、微信公众号充值等）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-48",
        "name":  "recharge_channel",
        "cnName":  "支付方式",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "支付方式",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221",
                      "来源说明：用户支付方式（例如微信、支付宝、华为、appstore、myCard）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-49",
        "name":  "currency",
        "cnName":  "货币类型",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "货币类型",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221",
                      "来源说明：用户充值(记账)货币类型（CNY/USD/EUR/...）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-50",
        "name":  "currency_unit",
        "cnName":  "货币单位",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "货币单位",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-51",
        "name":  "amount",
        "cnName":  "充值金额",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "充值金额",
        "sample":  "应用事件：205，221",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：205，221",
                      "来源说明：用户充值(记账)金额"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-52",
        "name":  "pay_currency",
        "cnName":  "支付货币",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "支付货币",
        "sample":  "应用事件：205，221；不发送：暂无区分",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：205，221；不发送：暂无区分",
                      "来源说明：用户充值(支付)货币类型（CNY/USD/EUR/...）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-53",
        "name":  "pay_amount",
        "cnName":  "支付金额",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "支付金额",
        "sample":  "应用事件：205，221；不发送：暂无区分",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：205，221；不发送：暂无区分",
                      "来源说明：用户充值(支付)金额"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-54",
        "name":  "pre_lev",
        "cnName":  "升级前角色等级",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "升级前角色等级",
        "sample":  "应用事件：206",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：206",
                      "来源说明：角色升级前等级"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-55",
        "name":  "pre_vip_lev",
        "cnName":  "升级前VIP等级",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "升级前VIP等级",
        "sample":  "应用事件：206；不发送：当前游戏无此信息",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：206；不发送：当前游戏无此信息",
                      "来源说明：VIP升级前等级"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-56",
        "name":  "user_count",
        "cnName":  "在线人数",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "在线人数",
        "sample":  "应用事件：207",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：207",
                      "来源说明：区服在线人数"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-57",
        "name":  "room",
        "cnName":  "游戏房间",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "游戏房间",
        "sample":  "应用事件：207；不发送：当前游戏无此信息",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：207；不发送：当前游戏无此信息",
                      "来源说明：暂无"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-58",
        "name":  "item_consumetype",
        "cnName":  "产销类型",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "产销类型",
        "sample":  "应用事件：208",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：208",
                      "来源说明：资源产销类型（\u00271\u0027:产出, \u00272\u0027:消耗）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-59",
        "name":  "scene",
        "cnName":  "游戏场景",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "游戏场景",
        "sample":  "应用事件：208",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：208",
                      "来源说明：资源产销来源场景（招募，商城，爬塔，活动）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-60",
        "name":  "item_type",
        "cnName":  "物品类型",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "物品类型",
        "sample":  "应用事件：208",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：208",
                      "来源说明：物品类型(一次性/永久性/时长性(周卡/月卡/年卡)/礼包)"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-61",
        "name":  "item_id",
        "cnName":  "物品ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "物品ID",
        "sample":  "应用事件：208",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：208",
                      "来源说明：物品ID"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-62",
        "name":  "item_name",
        "cnName":  "物品名称",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "物品名称",
        "sample":  "应用事件：208",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：208",
                      "来源说明：物品名称"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-63",
        "name":  "item_num",
        "cnName":  "物品数量",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "物品数量",
        "sample":  "应用事件：208",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：208",
                      "来源说明：物品数量"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-64",
        "name":  "left_num",
        "cnName":  "库存数量",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "库存数量",
        "sample":  "应用事件：208",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：208",
                      "来源说明：物品库存数量"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-65",
        "name":  "gift_content",
        "cnName":  "礼包内容",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "礼包内容",
        "sample":  "应用事件：208",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：208",
                      "来源说明：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-66",
        "name":  "action_id",
        "cnName":  "行为ID",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "行为ID",
        "sample":  "应用事件：208",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：208",
                      "来源说明：资源产销行为流水ID，可以关联game_uuid参数"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-67",
        "name":  "chat_channel",
        "cnName":  "聊天频道",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "聊天频道",
        "sample":  "应用事件：219；不发送：当前游戏无此功能",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：219；不发送：当前游戏无此功能",
                      "来源说明：聊天消息发送频道"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-68",
        "name":  "chat_content",
        "cnName":  "聊天内容",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "聊天内容",
        "sample":  "应用事件：219；不发送：当前游戏无此功能",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：219；不发送：当前游戏无此功能",
                      "来源说明：聊天内容文本"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-69",
        "name":  "recipient_id",
        "cnName":  "接受者(角色)ID",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "接受者(角色)ID",
        "sample":  "应用事件：219；不发送：当前游戏无此功能",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：219；不发送：当前游戏无此功能",
                      "来源说明：私聊时，聊天消息接收角色ID"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-70",
        "name":  "game_order_id",
        "cnName":  "游戏内订单号",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "游戏内订单号",
        "sample":  "应用事件：221；step_id=501后发送",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：221；step_id=501后发送",
                      "来源说明：游戏内订单编号，step_id=501后发送"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-71",
        "name":  "step_version",
        "cnName":  "步骤版本号",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "步骤版本号",
        "sample":  "应用事件：221，223",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：221，223",
                      "来源说明：行为步骤编号定义版本，年月日标记：20250120（建议放入包体信息）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-72",
        "name":  "step_id",
        "cnName":  "步骤ID",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "步骤ID",
        "sample":  "应用事件：221，223",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：221，223",
                      "来源说明：行为步骤编号"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-73",
        "name":  "step_name",
        "cnName":  "步骤名称",
        "type":  "待补类型",
        "required":  "是",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "步骤名称",
        "sample":  "应用事件：221，223",
        "risk":  "中",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "必填校验：该字段在命中文档范围内默认为必填。",
                      "备注约束：应用事件：221，223",
                      "来源说明：行为步骤名称"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-74",
        "name":  "active_type",
        "cnName":  "行为方式",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "行为方式",
        "sample":  "应用事件：221；不发送：简单整合为step_status",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：221；不发送：简单整合为step_status",
                      "来源说明：行为方式（自行拟定）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-75",
        "name":  "status",
        "cnName":  "步骤状态",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "步骤状态",
        "sample":  "应用事件：221；不发送：简单整合为step_status",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：221；不发送：简单整合为step_status",
                      "来源说明：状态信息；结果返回信息"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-76",
        "name":  "is_success",
        "cnName":  "行为结果",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "行为结果",
        "sample":  "应用事件：221；不发送：沿用result字段",
        "risk":  "高",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：221；不发送：沿用result字段",
                      "来源说明：行为结果（成功：0，失败：1，其他：2）"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-77",
        "name":  "step_status",
        "cnName":  "步骤状态",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "步骤状态",
        "sample":  "应用事件：221，223",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：221，223",
                      "来源说明：步骤状态，自行拟定"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-78",
        "name":  "ad_sid",
        "cnName":  "视频流水号",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "视频流水号",
        "sample":  "应用事件：223",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：223",
                      "来源说明：游戏侧激励视频流水号，参照支付订单号生成"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-79",
        "name":  "reward_target",
        "cnName":  "视频奖励目标",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "视频奖励目标",
        "sample":  "应用事件：223",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：应用事件：223",
                      "来源说明：激励视频对应奖励目标，参照支付商品标识"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-80",
        "name":  "",
        "cnName":  "",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-81",
        "name":  "",
        "cnName":  "",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-82",
        "name":  "",
        "cnName":  "",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "",
        "sample":  "见原始文档",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    },
    {
        "id":  "field-83",
        "name":  "$param1",
        "cnName":  "自定义参数 1",
        "type":  "待补类型",
        "required":  "否",
        "domain":  "花花世界埋点字段",
        "source":  "花花世界 RM 版 V251222",
        "purpose":  "自定义参数 1",
        "sample":  "自定义事件参数",
        "risk":  "低",
        "events":  [
                       "待从事件基线补齐关联事件"
                   ],
        "rules":  [
                      "当前文档未标为必填，需结合事件范围确认。",
                      "备注约束：自定义事件参数",
                      "来源说明：xxxxx"
                  ],
        "aiTips":  [
                       "AI 建议补齐类型、示例值和适用事件范围。",
                       "AI 建议把空白说明字段优先转入待确认清单。"
                   ]
    }
];
export const integrationSummary = [
    {
        "label":  "接入平台",
        "note":  "Android / iOS / 微信小游戏 / 鸿蒙",
        "value":  "4"
    },
    {
        "label":  "责任层",
        "note":  "游戏客户端 / 游戏服务端 / SDK客户端 / SDK服务端",
        "value":  "4"
    },
    {
        "label":  "当前重点",
        "note":  "全部来自真实文档链路",
        "value":  "新手、支付、透传"
    },
    {
        "label":  "待协调项",
        "note":  "平台差异、环境差异与包体范围",
        "value":  "6"
    }
];
export const integrationRows = [
    {
        "id":  "int-1",
        "platform":  "Android",
        "side":  "SDK客户端",
        "owner":  "SDK客户端",
        "event":  "TutorialStep / PayFlow",
        "scope":  "基础链 / 新手链 / 支付链",
        "status":  "进行中",
        "blocker":  "支付字段与推荐项待确认",
        "changedAt":  "2026-04-22"
    },
    {
        "id":  "int-2",
        "platform":  "Android",
        "side":  "游戏服务端",
        "owner":  "游戏服务端",
        "event":  "221 PayFlow / 205 Pay",
        "scope":  "支付链",
        "status":  "待确认",
        "blocker":  "订单字段未获取",
        "changedAt":  "2026-04-22"
    },
    {
        "id":  "int-3",
        "platform":  "iOS",
        "side":  "SDK客户端",
        "owner":  "SDK客户端",
        "event":  "基础链",
        "scope":  "启动 / 登录 / 创角",
        "status":  "已纳入",
        "blocker":  "无",
        "changedAt":  "2026-04-22"
    },
    {
        "id":  "int-4",
        "platform":  "微信小游戏",
        "side":  "游戏客户端",
        "owner":  "游戏客户端",
        "event":  "基础链 / 新手链",
        "scope":  "透传能力差异待确认",
        "status":  "待规划",
        "blocker":  "平台能力差异",
        "changedAt":  "2026-04-22"
    },
    {
        "id":  "int-5",
        "platform":  "鸿蒙",
        "side":  "SDK服务端",
        "owner":  "SDK服务端",
        "event":  "支付链",
        "scope":  "本期排除",
        "status":  "未纳入",
        "blocker":  "当前阶段不接支付链",
        "changedAt":  "2026-04-22"
    }
];
export const integrationMatrix = [
    {
        "platform":  "Android",
        "owners":  [
                       {
                           "scope":  "基础链 / 新手链",
                           "status":  "进行中",
                           "owner":  "游戏客户端",
                           "note":  "TutorialStep 待确认升级"
                       },
                       {
                           "scope":  "支付链",
                           "status":  "待确认",
                           "owner":  "游戏服务端",
                           "note":  "订单字段待确认"
                       },
                       {
                           "scope":  "SDK 自动事件",
                           "status":  "已纳入",
                           "owner":  "SDK客户端",
                           "note":  "111/114/102/104/105"
                       },
                       {
                           "scope":  "支付回调",
                           "status":  "进行中",
                           "owner":  "SDK服务端",
                           "note":  "发货通知映射补齐"
                       }
                   ]
    },
    {
        "platform":  "iOS",
        "owners":  [
                       {
                           "scope":  "基础链",
                           "status":  "已纳入",
                           "owner":  "游戏客户端",
                           "note":  "沿用当前 RM 基线"
                       },
                       {
                           "scope":  "支付链",
                           "status":  "待确认",
                           "owner":  "游戏服务端",
                           "note":  "与 Android 共用规则"
                       },
                       {
                           "scope":  "SDK 自动事件",
                           "status":  "已纳入",
                           "owner":  "SDK客户端",
                           "note":  "字段口径复用"
                       },
                       {
                           "scope":  "回调链",
                           "status":  "待确认",
                           "owner":  "SDK服务端",
                           "note":  "待补回调日志样本"
                       }
                   ]
    },
    {
        "platform":  "微信小游戏",
        "owners":  [
                       {
                           "scope":  "基础链 / 新手链",
                           "status":  "待规划",
                           "owner":  "游戏客户端",
                           "note":  "需确认能力边界"
                       },
                       {
                           "scope":  "基础链",
                           "status":  "候选",
                           "owner":  "游戏服务端",
                           "note":  "视小游戏登录链而定"
                       },
                       {
                           "scope":  "公共字段",
                           "status":  "待确认",
                           "owner":  "SDK客户端",
                           "note":  "device_id 能力差异"
                       },
                       {
                           "scope":  "回调",
                           "status":  "未纳入",
                           "owner":  "SDK服务端",
                           "note":  "当前无支付链"
                       }
                   ]
    },
    {
        "platform":  "鸿蒙",
        "owners":  [
                       {
                           "scope":  "基础链",
                           "status":  "待规划",
                           "owner":  "游戏客户端",
                           "note":  "当前仅预留"
                       },
                       {
                           "scope":  "基础链",
                           "status":  "候选",
                           "owner":  "游戏服务端",
                           "note":  "待项目决定"
                       },
                       {
                           "scope":  "公共字段",
                           "status":  "待确认",
                           "owner":  "SDK客户端",
                           "note":  "需看平台实现"
                       },
                       {
                           "scope":  "支付链",
                           "status":  "未纳入",
                           "owner":  "SDK服务端",
                           "note":  "本期排除"
                       }
                   ]
    }
];
export const integrationUnits = [
    {
        "unitName":  "Android 官方测试包",
        "version":  "V251222",
        "env":  "测试服",
        "stage":  "基线收口",
        "nodes":  "基础链 / 新手链 / 支付链",
        "status":  "待验收",
        "result":  "待确认",
        "risk":  "新手与支付字段仍有灰区"
    },
    {
        "unitName":  "Android 华为渠道包",
        "version":  "V251222",
        "env":  "测试服",
        "stage":  "接入协同",
        "nodes":  "基础链",
        "status":  "进行中",
        "result":  "待补样本",
        "risk":  "渠道分包透传待确认"
    },
    {
        "unitName":  "iOS 官方包",
        "version":  "V251222",
        "env":  "预发布",
        "stage":  "基础链通过",
        "nodes":  "基础链",
        "status":  "已通过",
        "result":  "通过",
        "risk":  "支付链未纳入当前范围"
    },
    {
        "unitName":  "微信小游戏包",
        "version":  "V251222",
        "env":  "测试服",
        "stage":  "能力确认",
        "nodes":  "基础链 / 新手链",
        "status":  "待规划",
        "result":  "待确认",
        "risk":  "device_id 能力差异"
    },
    {
        "unitName":  "Android 联运支付测试包",
        "version":  "V251222",
        "env":  "支付测试环境",
        "stage":  "专项验证",
        "nodes":  "支付链",
        "status":  "未纳入",
        "result":  "本期排除",
        "risk":  "需进入下一阶段"
    }
];
export const acceptanceSummary = [
    {
        "label":  "当前结论",
        "note":  "自动校验已发现关键灰区",
        "value":  "部分通过"
    },
    {
        "label":  "自动校验规则",
        "note":  "覆盖必填、枚举、格式、透传、例外",
        "value":  "9"
    },
    {
        "label":  "待人工确认",
        "note":  "集中在支付未获取与推荐项升级",
        "value":  "6"
    },
    {
        "label":  "可追溯版本",
        "note":  "全部问题已绑定文档来源",
        "value":  "V251222"
    }
];
export const logSummary = [
    {
        "label":  "日志样本",
        "note":  "全部来自真实事件清单映射",
        "value":  "48"
    },
    {
        "label":  "通过",
        "note":  "可直接核对字段样本",
        "value":  "46"
    },
    {
        "label":  "异常",
        "note":  "优先进入人工确认",
        "value":  "2"
    },
    {
        "label":  "查询方案",
        "note":  "围绕新手、支付、透传、核心事件",
        "value":  "4"
    }
];
export const logRows = [
    {
        "id":  "log-1",
        "eventName":  "Startup",
        "env":  "测试服",
        "side":  "SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 11:21:00",
        "traceId":  "HHSJ-111-1",
        "summary":  "游戏侧调用SDK初始化时，SDK自动上报",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-2",
        "eventName":  "SDKLogin",
        "env":  "测试服",
        "side":  "SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 12:22:00",
        "traceId":  "HHSJ-114-2",
        "summary":  "SDK初始化后，主动发起平台登录成功，SDK自动上报",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-3",
        "eventName":  "GameLogin",
        "env":  "测试服",
        "side":  "SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 13:23:00",
        "traceId":  "HHSJ-102-3",
        "summary":  "游戏侧调用SDK登录时，SDK自动上报",
        "fields":  [
                       "event_id：核心事件ID = \"215\"，HYL:游戏侧调用SDK登录获得参数，服务端验签结果上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"账号验签\"",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-4",
        "eventName":  "EnterGame",
        "env":  "测试服",
        "side":  "SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 14:24:00",
        "traceId":  "HHSJ-104-4",
        "summary":  "游戏侧调用SDK进入游戏时，SDK自动上报",
        "fields":  [
                       "event_id：核心事件ID = \"203\"，HYL:游戏侧账号登录成功后，完成账号下角色登录上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色登录\""
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-5",
        "eventName":  "LevelUp",
        "env":  "测试服",
        "side":  "SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 15:25:00",
        "traceId":  "HHSJ-105-5",
        "summary":  "游戏侧调用SDK角色升级时，SDK自动上报",
        "fields":  [
                       "event_id：核心事件ID = \"206\"，HYL:游戏侧角色升级时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色升级\"",
                       "pre_lev：升级前角色等级"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-6",
        "eventName":  "PayFlow",
        "env":  "预发布",
        "side":  "研发-前端/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 16:20:00",
        "traceId":  "HHSJ-106-6",
        "summary":  "游戏侧\u0026SDK支付流程中，按支付漏斗需求通过SDK分别上报",
        "fields":  [
                       "event_id：核心事件ID = \"221\"，HYL:游戏侧在支付流程中，按支付漏斗需求上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"支付流程\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "channel_order_id：充值商户订单号，即平台侧or渠道侧订单号，对应支付成功【发货通知：channelOrderId】",
                       "order_id：中台充值订单ID，即SDK充值订单号，对应支付成功【发货通知：orderId】",
                       "game_order_id：游戏内订单号，按游戏内逻辑生成的支付订单号",
                       "product_ID：支付内容产品标识",
                       "product_name：支付内容产品名称",
                       "pay_channel：充值渠道，对应支付成功【发货通知：payWay】",
                       "recharge_channel：支付方式，对应支付成功【发货通知：rechargeType】",
                       "currency：支付货币类型，如：CNY、USD、HKD、JPY等（ISO-4217标准）",
                       "currency_unit：支付货币单位：0=legalUnit=元单位，1=cent=分单位",
                       "amount：支付货币金额，法币单位×100，如：100 = 1.00元，299 = 2.99元"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-7",
        "eventName":  "PreEvent",
        "env":  "测试服",
        "side":  "研发-前端/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 17:21:00",
        "traceId":  "HHSJ-107-7",
        "summary":  "游戏侧启动登录加载流程中，按自定义step通过SDK进行上报",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"1\"",
                       "extra：",
                       "stepId：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "stepName：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-8",
        "eventName":  "TutorialStep",
        "env":  "测试服",
        "side":  "研发-前端/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 18:22:00",
        "traceId":  "HHSJ-108-8",
        "summary":  "游戏侧新手引导流程中，按自定义step通过SDK将进行上报",
        "fields":  [
                       "type：GSSdk.analytics.track()，type = \"2\"",
                       "extra：",
                       "stepId：步骤ID，游戏内引导步骤编号",
                       "stepName：步骤名称，游戏内引导步骤名称"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-9",
        "eventName":  "AdVideo",
        "env":  "测试服",
        "side":  "研发-前端/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 19:23:00",
        "traceId":  "HHSJ-110-9",
        "summary":  "参照【支付流程】，在激励视频业务中的流程通过SDK上报",
        "fields":  [
                       "event_id：核心事件ID = \"223\"，HYL:参照【支付流程】，在激励视频业务中的流程上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"激励视频\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "ad_sid：游戏侧激励视频流水号，参照支付订单号生成",
                       "reward_target：激励视频对应奖励目标，参照支付商品标识，\u003e\u003e点击查看：奖励目标\u003c\u003c"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-10",
        "eventName":  "GameLoginCustome",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "异常",
        "eventTime":  "2026-04-28 10:24:00",
        "traceId":  "HHSJ-214-10",
        "summary":  "未使用GSSDK账号体系，登录时间上报",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：当前文档标记为不发送，需在规则中心确认为例外还是缺口。",
                            "当前状态：未实现",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-11",
        "eventName":  "GameLoginSign",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 11:25:00",
        "traceId":  "HHSJ-215-11",
        "summary":  "游戏侧调用SDK登录获得参数，服务端验签结果上报",
        "fields":  [
                       "event_id：核心事件ID = \"215\"，HYL:游戏侧调用SDK登录获得参数，服务端验签结果上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"账号验签\"",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-12",
        "eventName":  "GameLogin",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 12:20:00",
        "traceId":  "HHSJ-201-12",
        "summary":  "游戏侧通过SDK登录参数验签，完成游戏内账号登录上报",
        "fields":  [
                       "event_id：核心事件ID = \"215\"，HYL:游戏侧调用SDK登录获得参数，服务端验签结果上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"账号验签\"",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-13",
        "eventName":  "RoleLogin",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 13:21:00",
        "traceId":  "HHSJ-203-13",
        "summary":  "游戏侧账号登录成功后，完成账号下角色登录上报",
        "fields":  [
                       "event_id：核心事件ID = \"203\"，HYL:游戏侧账号登录成功后，完成账号下角色登录上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色登录\""
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-14",
        "eventName":  "RoleLogout",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 14:22:00",
        "traceId":  "HHSJ-204-14",
        "summary":  "游戏侧角色登出(登出标准自定义)时上报",
        "fields":  [
                       "event_id：核心事件ID = \"204\"，HYL:游戏侧角色登出(登出标准自定义)时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色登出\"",
                       "duration：在线时长(秒s)，玩家下线Logout时，统计的本次登录在线时长"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-15",
        "eventName":  "Pay",
        "env":  "预发布",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 15:23:00",
        "traceId":  "HHSJ-205-15",
        "summary":  "游戏侧完成角色支付发货流程时上报",
        "fields":  [
                       "event_id：核心事件ID = \"221\"，HYL:游戏侧在支付流程中，按支付漏斗需求上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"支付流程\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "channel_order_id：充值商户订单号，即平台侧or渠道侧订单号，对应支付成功【发货通知：channelOrderId】",
                       "order_id：中台充值订单ID，即SDK充值订单号，对应支付成功【发货通知：orderId】",
                       "game_order_id：游戏内订单号，按游戏内逻辑生成的支付订单号",
                       "product_ID：支付内容产品标识",
                       "product_name：支付内容产品名称",
                       "pay_channel：充值渠道，对应支付成功【发货通知：payWay】",
                       "recharge_channel：支付方式，对应支付成功【发货通知：rechargeType】",
                       "currency：支付货币类型，如：CNY、USD、HKD、JPY等（ISO-4217标准）",
                       "currency_unit：支付货币单位：0=legalUnit=元单位，1=cent=分单位",
                       "amount：支付货币金额，法币单位×100，如：100 = 1.00元，299 = 2.99元"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-16",
        "eventName":  "LevelUp",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 16:24:00",
        "traceId":  "HHSJ-206-16",
        "summary":  "游戏侧角色升级时上报",
        "fields":  [
                       "event_id：核心事件ID = \"206\"，HYL:游戏侧角色升级时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"角色升级\"",
                       "pre_lev：升级前角色等级"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-17",
        "eventName":  "CCU",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 17:25:00",
        "traceId":  "HHSJ-207-17",
        "summary":  "按整0/5分固定5min间隔上报",
        "fields":  [
                       "event_id：核心事件ID = \"207\"，HYL:游戏各区服，按整0/5分固定5min间隔上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"在线人数\"",
                       "user_count：在线人数"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-18",
        "eventName":  "Prop",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 18:20:00",
        "traceId":  "HHSJ-208-18",
        "summary":  "游戏侧角色任意游戏资产变更时上报",
        "fields":  [
                       "event_id：核心事件ID = \"208\"，HYL:游戏侧角色任意游戏资产变更时上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"资源产销\"",
                       "item_consumetype：资源产销类型：\"1\" = 产出，\"2\" = 消耗",
                       "scene：资源产销来源场景，\u003e\u003e点击查看：场景枚举\u003c\u003c",
                       "scene_extension：资源产销来源扩展参数，商品ID、随机礼盒ID等",
                       "item_type：物品类型(财务类型)，\u003e\u003e点击查看：物品类型\u003c\u003c",
                       "item_id：物品ID，\u003e\u003e点击查看：物品ID\u003c\u003c",
                       "item_name：物品名称，字典表对应物品ID",
                       "item_num：物品数量，物品产销变更数量",
                       "left_num：物品库存数量，物品产销变更后数量",
                       "gift_content：礼包类物品的内容，json格式；{item_id:item_num,item_id:item_num}",
                       "action_id：资源产销行为流水ID，可以关联game_uuid参数"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-19",
        "eventName":  "ChatLog",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "异常",
        "eventTime":  "2026-04-28 19:21:00",
        "traceId":  "HHSJ-219-19",
        "summary":  "玩家角色在游戏内聊天成功发送消息时上报",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：当前文档标记为不发送，需在规则中心确认为例外还是缺口。",
                            "当前状态：未实现",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-20",
        "eventName":  "PayFlow",
        "env":  "预发布",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 10:22:00",
        "traceId":  "HHSJ-221-20",
        "summary":  "游戏侧在支付流程中，按支付漏斗需求上报",
        "fields":  [
                       "event_id：核心事件ID = \"221\"，HYL:游戏侧在支付流程中，按支付漏斗需求上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"支付流程\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "channel_order_id：充值商户订单号，即平台侧or渠道侧订单号，对应支付成功【发货通知：channelOrderId】",
                       "order_id：中台充值订单ID，即SDK充值订单号，对应支付成功【发货通知：orderId】",
                       "game_order_id：游戏内订单号，按游戏内逻辑生成的支付订单号",
                       "product_ID：支付内容产品标识",
                       "product_name：支付内容产品名称",
                       "pay_channel：充值渠道，对应支付成功【发货通知：payWay】",
                       "recharge_channel：支付方式，对应支付成功【发货通知：rechargeType】",
                       "currency：支付货币类型，如：CNY、USD、HKD、JPY等（ISO-4217标准）",
                       "currency_unit：支付货币单位：0=legalUnit=元单位，1=cent=分单位",
                       "amount：支付货币金额，法币单位×100，如：100 = 1.00元，299 = 2.99元"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-21",
        "eventName":  "AdVideo",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 11:23:00",
        "traceId":  "HHSJ-223-21",
        "summary":  "参照【支付流程】，在激励视频业务中的流程上报",
        "fields":  [
                       "event_id：核心事件ID = \"223\"，HYL:参照【支付流程】，在激励视频业务中的流程上报",
                       "start_time：数据发生时间(13位时间戳)",
                       "event_name：= \"激励视频\"",
                       "step_version：步骤版本号，游戏自定义的步骤列表版本号",
                       "step_id：步骤ID，\u003e\u003e点击查看：步骤列表\u003c\u003c",
                       "step_name：步骤名称，\u003e\u003e点击查看：步骤名称\u003c\u003c",
                       "result：步骤结果，0：成功，其他：失败(错误码)",
                       "result_msg：结果信息，错误原因返回",
                       "ad_sid：游戏侧激励视频流水号，参照支付订单号生成",
                       "reward_target：激励视频对应奖励目标，参照支付商品标识，\u003e\u003e点击查看：奖励目标\u003c\u003c"
                   ],
        "diagnostics":  [
                            "规则结论：该事件纳入当前基线，默认参与一期验收。",
                            "当前状态：已纳入基线",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-22",
        "eventName":  "event_\u003e 10000",
        "env":  "测试服",
        "side":  "研发/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 12:24:00",
        "traceId":  "HHSJ-\u003e 10000-22",
        "summary":  "",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-23",
        "eventName":  "custom_20001",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 13:25:00",
        "traceId":  "HHSJ-20001-23",
        "summary":  "HYL:新手引导环节开始\u0026完成，= Tutorial.id",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-24",
        "eventName":  "custom_20002",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 14:20:00",
        "traceId":  "HHSJ-20002-24",
        "summary":  "HYL:玩家成长日志，包括：玩家/商店/种植物等成长",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-25",
        "eventName":  "custom_20003",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 15:21:00",
        "traceId":  "HHSJ-20003-25",
        "summary":  "HYL:玩家成长解锁内容，包括：功能/种植物/花艺配方等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-26",
        "eventName":  "custom_20004",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 16:22:00",
        "traceId":  "HHSJ-20004-26",
        "summary":  "HYL:游戏货币变更日志，参照【资源产销-Prop】",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-27",
        "eventName":  "custom_20005",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 17:23:00",
        "traceId":  "HHSJ-20005-27",
        "summary":  "HYL:角色下线后异步上报(与Logout同时)",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-28",
        "eventName":  "custom_20006",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 18:24:00",
        "traceId":  "HHSJ-20006-28",
        "summary":  "HYL:鲜花种植相关操作日志，培育/种植/浇水/收获等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-29",
        "eventName":  "custom_20007",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 19:25:00",
        "traceId":  "HHSJ-20007-29",
        "summary":  "HYL:花艺制作相关操作日志，制作\u0026收获等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-30",
        "eventName":  "custom_20008",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 10:20:00",
        "traceId":  "HHSJ-20008-30",
        "summary":  "HYL:花艺售卖相关操作日志，上架/结算/下架等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-31",
        "eventName":  "custom_20009",
        "env":  "预发布",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 11:21:00",
        "traceId":  "HHSJ-20009-31",
        "summary":  "HYL:经营订单相关操作日志，触发/交付/结算等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-32",
        "eventName":  "custom_20010",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 12:22:00",
        "traceId":  "HHSJ-20010-32",
        "summary":  "HYL:场景事件相关操作日志，触发/完成等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-33",
        "eventName":  "custom_20011",
        "env":  "测试服",
        "side":  "研发-前端/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 13:23:00",
        "traceId":  "HHSJ-20011-33",
        "summary":  "HYL:剧情播放相关操作日志，跳过/自动/回看等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-34",
        "eventName":  "custom_20012",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 14:24:00",
        "traceId":  "HHSJ-20012-34",
        "summary":  "HYL:任务成就相关操作日志，触发/领取/完成/交付等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-35",
        "eventName":  "custom_20013",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 15:25:00",
        "traceId":  "HHSJ-20013-35",
        "summary":  "HYL:分档奖励相关操作日志，达成/领取等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-36",
        "eventName":  "custom_20014",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 16:20:00",
        "traceId":  "HHSJ-20014-36",
        "summary":  "HYL:玩家换装相关操作日志，穿上/脱下/染色等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-37",
        "eventName":  "custom_20015",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 17:21:00",
        "traceId":  "HHSJ-20015-37",
        "summary":  "HYL:场景布置相关操作日志，布置/移动/收回等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-38",
        "eventName":  "custom_20016",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 18:22:00",
        "traceId":  "HHSJ-20016-38",
        "summary":  "HYL:社交好友相关操作日志，加好友/互助等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-39",
        "eventName":  "custom_20017",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 19:23:00",
        "traceId":  "HHSJ-20017-39",
        "summary":  "HYL:交易系统相关操作日志，寄售/购买等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-40",
        "eventName":  "custom_20018",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 10:24:00",
        "traceId":  "HHSJ-20018-40",
        "summary":  "HYL:玩家排行相关行为日志，排名变动/奖励领取等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-41",
        "eventName":  "custom_20019",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 11:25:00",
        "traceId":  "HHSJ-20019-41",
        "summary":  "HYL:公会相关基础行为日志，建设/分享/兑换等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-42",
        "eventName":  "custom_20020",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 12:20:00",
        "traceId":  "HHSJ-20020-42",
        "summary":  "HYL:公会竞赛相关行为日志，领取/升级/完成公会任务等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-43",
        "eventName":  "custom_20021",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 13:21:00",
        "traceId":  "HHSJ-20021-43",
        "summary":  "HYL:内嵌游戏相关操作日志，挑战/评分/结算等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-44",
        "eventName":  "custom_20022",
        "env":  "测试服",
        "side":  "研发-前端/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 14:22:00",
        "traceId":  "HHSJ-20022-44",
        "summary":  "HYL:根据平台要求，针对特定入口激励类功能的行为日志",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-45",
        "eventName":  "custom_20023",
        "env":  "测试服",
        "side":  "研发-前端/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 15:23:00",
        "traceId":  "HHSJ-20023-45",
        "summary":  "HYL:平台特性相关操作日志，触发/发起/完成/反馈等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-46",
        "eventName":  "custom_20024",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 16:24:00",
        "traceId":  "HHSJ-20024-46",
        "summary":  "HYL:通用商店机制中，商品购买日志",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-47",
        "eventName":  "custom_20025",
        "env":  "测试服",
        "side":  "研发-后端",
        "status":  "通过",
        "eventTime":  "2026-04-28 17:25:00",
        "traceId":  "HHSJ-20025-47",
        "summary":  "HYL:扭蛋抽奖相关行为日志，单抽/十连/保底等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    },
    {
        "id":  "log-48",
        "eventName":  "custom_20026",
        "env":  "测试服",
        "side":  "研发-前端/SDK",
        "status":  "通过",
        "eventTime":  "2026-04-28 18:20:00",
        "traceId":  "HHSJ-20026-48",
        "summary":  "HYL:活动类HUD界面操作日志，弹出/打开/完成/关闭等",
        "fields":  [
                       "见原始事件清单，当前事件尚未补充字段拆解。"
                   ],
        "diagnostics":  [
                            "规则结论：待从字段基线和版本差异中补充规则。",
                            "当前状态：候选",
                            "可结合事件基线和字段基线继续下钻。"
                        ]
    }
];
export const logQuerySchemes = [
    {
        "id":  "scheme-1",
        "name":  "新手链核验",
        "scope":  "TutorialStep / Tutorial",
        "note":  "核对步骤事件、步骤字段和顺序",
        "columns":  [
                        "事件",
                        "环境",
                        "stepId",
                        "stepName",
                        "状态"
                    ]
    },
    {
        "id":  "scheme-2",
        "name":  "支付链异常排查",
        "scope":  "106 / 221 / 205",
        "note":  "核对订单字段、支付步骤和发货通知",
        "columns":  [
                        "事件",
                        "环境",
                        "order_id",
                        "channel_order_id",
                        "状态"
                    ]
    },
    {
        "id":  "scheme-3",
        "name":  "透传字段核验",
        "scope":  "cpsid / device_id / c_oneid / s_oneid",
        "note":  "核对客户端到服务端透传",
        "columns":  [
                        "事件",
                        "环境",
                        "cpsid",
                        "device_id",
                        "状态"
                    ]
    },
    {
        "id":  "scheme-4",
        "name":  "核心事件覆盖检查",
        "scope":  "全部必接事件",
        "note":  "核对核心事件是否已进入当前基线",
        "columns":  [
                        "事件",
                        "上报端",
                        "是否必须",
                        "状态"
                    ]
    }
];
export const autoCheckRules = [
    "必填规则：TutorialStep 的 stepId、stepName 必须存在。",
    "必填规则：支付链 order_id、game_order_id 在命中步骤范围内必须显式说明。",
    "枚举/格式：PayFlow.result 仅允许 0 或错误码。",
    "透传规则：cpsid、device_id、c_oneid、s_oneid 在需要服务端串联的链路中必须说明来源。",
    "例外规则：文档标记“不发送/未获取”的字段不能直接默认为通过，必须进入待确认。",
    "范围规则：推荐项、排除项、后续补齐项必须绑定适用版本和结论。",
    "差异规则：新旧事件 ID 映射变更必须进入版本差异说明。",
    "环境规则：支付测试环境与生产环境需显式区分。",
    "人工门禁：自动校验后只把灰区、例外和阻塞项交给人工确认。"
];
export const acceptanceRows = [
    {
        "id":  "acc-1",
        "event":  "TutorialStep",
        "issue":  "stepId 口径待确认",
        "severity":  "P0",
        "dimension":  "字段必填",
        "owner":  "数分 / 游戏客户端",
        "status":  "待确认",
        "updatedAt":  "2026-04-22",
        "next":  "明确步骤口径后复验",
        "impact":  "影响新手漏斗可比性",
        "rootCause":  "文档中存在推荐项与必接项边界不清",
        "suggestion":  "把步骤定义和是否必接写成显式规则"
    },
    {
        "id":  "acc-2",
        "event":  "Tutorial",
        "issue":  "后端映射关系未完全沉淀",
        "severity":  "P1",
        "dimension":  "事件映射",
        "owner":  "游戏服务端",
        "status":  "处理中",
        "updatedAt":  "2026-04-22",
        "next":  "补充映射说明",
        "impact":  "影响新旧事件迁移理解",
        "rootCause":  "历史映射留在备注中",
        "suggestion":  "进入版本差异页固化映射"
    },
    {
        "id":  "acc-3",
        "event":  "PayFlow",
        "issue":  "order_id 未获取",
        "severity":  "P0",
        "dimension":  "支付链字段",
        "owner":  "游戏服务端 / SDK服务端",
        "status":  "异常",
        "updatedAt":  "2026-04-22",
        "next":  "确认替代字段或补获取方案",
        "impact":  "影响订单回查与支付归因",
        "rootCause":  "字段说明中显式标记未获取",
        "suggestion":  "进入例外确认或补采集"
    },
    {
        "id":  "acc-4",
        "event":  "PayFlow",
        "issue":  "channel_order_id 未获取",
        "severity":  "P0",
        "dimension":  "支付链字段",
        "owner":  "SDK服务端",
        "status":  "异常",
        "updatedAt":  "2026-04-22",
        "next":  "评估是否阻塞当前放行",
        "impact":  "影响商户订单回查",
        "rootCause":  "当前链路未打通",
        "suggestion":  "先给例外，再挂下一阶段待办"
    },
    {
        "id":  "acc-5",
        "event":  "Pay",
        "issue":  "发货通知映射未完全闭环",
        "severity":  "P1",
        "dimension":  "事件关联",
        "owner":  "游戏服务端",
        "status":  "待复验",
        "updatedAt":  "2026-04-22",
        "next":  "补充发货通知样本",
        "impact":  "影响支付成功到发货的串联",
        "rootCause":  "跨事件字段未沉淀",
        "suggestion":  "把映射字段纳入规则中心"
    },
    {
        "id":  "acc-6",
        "event":  "cpsid / device_id",
        "issue":  "透传链路待确认",
        "severity":  "P0",
        "dimension":  "透传一致性",
        "owner":  "SDK客户端 / 游戏服务端",
        "status":  "待确认",
        "updatedAt":  "2026-04-22",
        "next":  "按平台补齐样本",
        "impact":  "影响渠道分包分析",
        "rootCause":  "客户端到服务端链路未统一说明",
        "suggestion":  "建立透传专项知识链接"
    },
    {
        "id":  "acc-7",
        "event":  "核心事件清单",
        "issue":  "部分必接事件仍未进入统一基线",
        "severity":  "P0",
        "dimension":  "基线收口",
        "owner":  "数分 / 产品",
        "status":  "处理中",
        "updatedAt":  "2026-04-23",
        "next":  "完成首轮文档基线确认",
        "impact":  "影响规则与验收一致性",
        "rootCause":  "事件清单分散在多份 Excel",
        "suggestion":  "先固化文档基线页再放大自动化"
    },
    {
        "id":  "acc-8",
        "event":  "推荐项",
        "issue":  "推荐项是否升级为必接未拍板",
        "severity":  "P1",
        "dimension":  "规则灰区",
        "owner":  "数分 / QA / 项管",
        "status":  "待确认",
        "updatedAt":  "2026-04-23",
        "next":  "在规则中心会签",
        "impact":  "影响新手链与前置链验收边界",
        "rootCause":  "原文档只写推荐未写后果",
        "suggestion":  "引入例外确认结论"
    }
];
export const acceptanceUnits = [
    {
        "unitName":  "Android 官方测试包",
        "version":  "V251222",
        "env":  "测试服",
        "stage":  "基线收口",
        "nodes":  "基础链 / 新手链 / 支付链",
        "status":  "待验收",
        "result":  "待确认",
        "risk":  "新手与支付字段仍有灰区"
    },
    {
        "unitName":  "Android 华为渠道包",
        "version":  "V251222",
        "env":  "测试服",
        "stage":  "接入协同",
        "nodes":  "基础链",
        "status":  "进行中",
        "result":  "待补样本",
        "risk":  "渠道分包透传待确认"
    },
    {
        "unitName":  "iOS 官方包",
        "version":  "V251222",
        "env":  "预发布",
        "stage":  "基础链通过",
        "nodes":  "基础链",
        "status":  "已通过",
        "result":  "通过",
        "risk":  "支付链未纳入当前范围"
    },
    {
        "unitName":  "微信小游戏包",
        "version":  "V251222",
        "env":  "测试服",
        "stage":  "能力确认",
        "nodes":  "基础链 / 新手链",
        "status":  "待规划",
        "result":  "待确认",
        "risk":  "device_id 能力差异"
    },
    {
        "unitName":  "Android 联运支付测试包",
        "version":  "V251222",
        "env":  "支付测试环境",
        "stage":  "专项验证",
        "nodes":  "支付链",
        "status":  "未纳入",
        "result":  "本期排除",
        "risk":  "需进入下一阶段"
    }
];
export const acceptanceBoard = [
    {
        "label":  "问题总量",
        "note":  "全部绑定真实链路与字段",
        "value":  "8"
    },
    {
        "label":  "阻塞上线",
        "note":  "集中在支付订单字段",
        "value":  "2"
    },
    {
        "label":  "例外待确认",
        "note":  "推荐项 / 未获取 / 排除项",
        "value":  "4"
    },
    {
        "label":  "知识链接",
        "note":  "已沉淀到新手、支付、透传三条链",
        "value":  "3"
    }
];
export const acceptanceProgressBoard = [
    {
        "unit":  "Android 官方测试包",
        "env":  "测试服",
        "owner":  "数分 / QA / 游戏客户端",
        "node":  "新手链 / 支付链",
        "stage":  "待确认",
        "blocker":  "支付字段和新手步骤规则仍有灰区",
        "next":  "完成灰区会签后复验"
    },
    {
        "unit":  "Android 华为渠道包",
        "env":  "测试服",
        "owner":  "SDK客户端 / 游戏客户端",
        "node":  "基础链 / 透传链",
        "stage":  "进行中",
        "blocker":  "cpsid 与 device_id 样本待补",
        "next":  "补样本后进入正式验收"
    },
    {
        "unit":  "iOS 官方包",
        "env":  "预发布",
        "owner":  "QA / 游戏客户端",
        "node":  "基础链",
        "stage":  "已通过",
        "blocker":  "无",
        "next":  "等待下一版本纳入支付链"
    },
    {
        "unit":  "微信小游戏包",
        "env":  "测试服",
        "owner":  "游戏客户端 / SDK客户端",
        "node":  "基础链",
        "stage":  "待规划",
        "blocker":  "平台能力差异",
        "next":  "明确能力边界后确定范围"
    }
];
export const versionSummary = [
    {
        "label":  "当前基线版本",
        "note":  "花花世界 RM 版主文档",
        "value":  "V251222"
    },
    {
        "label":  "事件基线",
        "note":  "统一收入口径中",
        "value":  "231"
    },
    {
        "label":  "字段基线",
        "note":  "待继续补类型与样例",
        "value":  "83"
    },
    {
        "label":  "差异重点",
        "note":  "全部来源于真实文档",
        "value":  "新手 / 支付 / 透传"
    }
];
export const versionRows = [
    {
        "id":  "ver-1",
        "module":  "文档基线",
        "object":  "TutorialStep / Tutorial",
        "type":  "补充说明",
        "oldValue":  "推荐项",
        "newValue":  "待确认是否升级为必接",
        "reason":  "影响新手漏斗分析",
        "risk":  "高",
        "accepted":  "待会签",
        "impact":  "影响规则边界与验收范围"
    },
    {
        "id":  "ver-2",
        "module":  "规则中心",
        "object":  "order_id / channel_order_id",
        "type":  "例外待定",
        "oldValue":  "未获取",
        "newValue":  "待确认例外或补采集",
        "reason":  "影响支付链闭环",
        "risk":  "高",
        "accepted":  "待确认",
        "impact":  "影响支付归因与订单回查"
    },
    {
        "id":  "ver-3",
        "module":  "透传链",
        "object":  "getTrackingInfo",
        "type":  "新增链路",
        "oldValue":  "分散说明",
        "newValue":  "独立透传专项",
        "reason":  "统一设备与分包透传",
        "risk":  "中",
        "accepted":  "进行中",
        "impact":  "影响客户端到服务端串联"
    }
];
export const versionTimeline = [
    {
        "version":  "2024-12-23",
        "stage":  "字段梳理",
        "note":  "形成客户端公共字段与建议 DWD 表名"
    },
    {
        "version":  "V251222",
        "stage":  "RM 版主文档",
        "note":  "形成 231 条事件、83 条字段、157 条核心事件字段明细"
    },
    {
        "version":  "2026-04-22",
        "stage":  "AI demo",
        "note":  "压缩出新手、支付、透传三条高价值链路"
    },
    {
        "version":  "2026-04-28",
        "stage":  "一期真源收口",
        "note":  "开始把真实文档转成前端可视化基线"
    }
];
export const versionScopeDiff = [
    {
        "id":  "scope-1",
        "version":  "V251222",
        "unit":  "新手引导链",
        "change":  "从散文档转为统一链路",
        "env":  "文档基线",
        "oldScope":  "推荐项分散在接入说明与核心事件中",
        "newScope":  "TutorialStep / Tutorial / stepId / stepName 统一呈现",
        "reason":  "便于规则生成与验收"
    },
    {
        "id":  "scope-2",
        "version":  "V251222",
        "unit":  "支付订单链",
        "change":  "显式暴露未获取字段",
        "env":  "规则中心",
        "oldScope":  "字段藏在备注",
        "newScope":  "order_id / channel_order_id 进入待确认列表",
        "reason":  "避免支付链灰区继续口头传播"
    },
    {
        "id":  "scope-3",
        "version":  "2026-04-22",
        "unit":  "透传链",
        "change":  "形成专项验收链",
        "env":  "验收中心",
        "oldScope":  "字段分散在多个 Excel",
        "newScope":  "cpsid / device_id / c_oneid / s_oneid 统一核验",
        "reason":  "支撑分包与设备分析"
    }
];
export const aiTabs = [
    {
        "id":  "qa",
        "label":  "智能问答"
    },
    {
        "id":  "tasks",
        "label":  "任务执行"
    },
    {
        "id":  "guide",
        "label":  "使用引导"
    }
];
export const aiKnowledgeSources = [
    "花花世界 RM 版主文档",
    "20241223 字段梳理",
    "SDK 行为日志埋点表",
    "AI demo 报告",
    "04-16 会议纪要"
];
export const aiTaskCards = [
    {
        "status":  "已完成",
        "title":  "输入提炼",
        "review":  "待人工确认灰区",
        "id":  "ai-task-1",
        "output":  "从 Excel / 纪要抽出事件、字段与风险词"
    },
    {
        "status":  "已完成",
        "title":  "文档标准化",
        "review":  "待文档基线会签",
        "id":  "ai-task-2",
        "output":  "统一事件、字段、版本差异结构"
    },
    {
        "status":  "进行中",
        "title":  "规则生成",
        "review":  "待规则中心确认",
        "id":  "ai-task-3",
        "output":  "必填、枚举、例外、环境规则草稿"
    },
    {
        "status":  "已完成",
        "title":  "结果总结",
        "review":  "待验收中心沉淀",
        "id":  "ai-task-4",
        "output":  "三条高风险链路总结"
    }
];
export const aiGuideCards = [
    {
        "start":  "先看总览",
        "path":  "总览 -\u003e 文档基线 -\u003e 规则中心 -\u003e 验收中心",
        "role":  "数分"
    },
    {
        "start":  "先看文档基线",
        "path":  "文档基线 -\u003e 接入协同 -\u003e 验收与协作",
        "role":  "游戏客户端"
    },
    {
        "start":  "先看支付链",
        "path":  "文档基线 -\u003e 规则中心 -\u003e 验收中心",
        "role":  "游戏服务端"
    },
    {
        "start":  "先看验收与协作",
        "path":  "验收与协作 -\u003e 验收中心 -\u003e 版本治理",
        "role":  "QA"
    }
];
