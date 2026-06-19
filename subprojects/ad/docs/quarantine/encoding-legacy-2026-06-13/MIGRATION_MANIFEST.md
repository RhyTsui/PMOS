# 乱码治理归档迁出清单 - 2026-06-13

## 目录用途

本目录用于记录建议迁出或隔离的历史资产。当前未自动移动整棵历史导入项目，以免破坏用户本地引用；如需实际迁出，建议将下列路径整体移动到本目录或仓库外归档位置。

## 建议迁出地址

`docs/quarantine/encoding-legacy-2026-06-13/`

## 建议迁出对象

| 路径 | 类型 | 原因 | 当前处理 |
|---|---|---|---|
| `imported/projects/**` | 导入历史区 | 全工作区审计中存在大量 CRLF/BOM；当前运行真源为 `frontend/src`，该目录不应作为新开发真源 | 保留原位，标记为 archive 非阻断 |
| `frontend/src/tmp/**` | 本地验收/浏览器 profile 生成物 | 浏览器扩展、profile、临时脚本存在 CRLF、invalid UTF-8 或检测样例 | 保留原位，标记为 generated 非阻断 |
| `tmp/**` | 本地临时脚本与验收资产 | 临时脚本含乱码检测样例，部分文件带 BOM/CRLF | 保留原位，标记为 generated 非阻断 |
| `.runtime/zhitou-chat/v2/users/**` | 本地运行态会话数据 | 历史会话文件可能带 BOM/CRLF，不作为源码真源 | 保留原位，标记为 generated 非阻断 |

## 已修复例外

`.runtime/zhitou-chat/runtime-config.json` 被当前 `frontend/src/src/lib/runtime-config.ts` 作为 legacy config 读取，不能只隔离；本轮已恢复其中用户可见展示配置为正常 UTF-8 中文。

## 后续迁出原则

- 若历史资产被 README、AGENTS、规格索引、脚本、测试、Prompt seed 或运行代码引用，先修正规格归属再迁移。
- 若确认无调用链路或链路废弃，可移动到本目录，并在本清单追加原路径、迁出时间和替代真源。
- 迁出后必须重新运行 `node scripts/check-text-encoding.cjs --scope=workspace --json --no-fail`。
