# 全工作区编码审计摘要 - 2026-06-13

## 结论

- 已跟踪生效文件通过 `npm.cmd run check:encoding` 和 `npm.cmd run check:mojibake`，阻断项为 0。
- 全工作区审计报告见 `docs/review/encoding-audit-2026-06-13.json`。
- 全工作区扫描 1898 个文本文件，跳过 3391 个二进制或非文本文件，剩余 491 条发现均为非阻断。
- 当前运行 legacy 配置 `.runtime/zhitou-chat/runtime-config.json` 曾包含用户可见错码，已恢复为源码默认中文展示配置并写回 UTF-8 without BOM。

## 剩余非阻断项

| 分类 | 数量 | 处理 |
|---|---:|---|
| generated / UTF-8 BOM | 13 | 临时生成物或本地运行文件，保留审计记录 |
| generated / CRLF | 183 | 浏览器 profile、临时验收文件等生成物，保留审计记录 |
| generated / invalid UTF-8 | 4 | 浏览器 profile 模型/扩展资源，不作为项目文本真源 |
| generated / replacement / known mojibake / dense pattern | 36 | 临时验收脚本中的检测样例或本地运行残留，非运行真源 |
| archive / CRLF | 253 | `imported/projects` 导入历史区，建议迁出或作为归档隔离 |
| archive / UTF-8 BOM | 2 | `imported/projects` 导入历史区，建议迁出或作为归档隔离 |

## 源头判断

- 根因一：仓库已有编码治理文档，但缺少根级 `.editorconfig`、`.gitattributes` 和 CI 质量门禁，导致 BOM/CRLF 可持续进入仓库。
- 根因二：旧脚本只覆盖 `frontend/src` 局部目录，未覆盖根目录文档、Python、schemas、Prompt/Trace/review 资产和导入历史区。
- 根因三：Windows PowerShell/Git 中文路径输出会产生终端错读噪声，必须基于字节级 UTF-8 校验和扫描器报告判断。
- 根因四：运行态配置曾由外部写入或历史工具以错误编码落盘，导致 `.runtime/zhitou-chat/runtime-config.json` 出现真实用户可见错码。

## 隔离建议

- `imported/projects/**` 是导入历史区，不属于当前 `frontend/src` 运行真源；建议迁出或作为归档隔离，清单见 `docs/quarantine/encoding-legacy-2026-06-13/MIGRATION_MANIFEST.md`。
- `frontend/src/tmp/**`、`tmp/**`、`.runtime/**` 属本地生成物或运行态文件；生成物不纳入提交门禁，但若被当前运行链路读取，必须修复源头写入逻辑。

## 验证记录

- `npm.cmd run check:encoding`：通过。
- `npm.cmd run check:mojibake`：通过。
- `node scripts/check-text-encoding.cjs --scope=workspace --json --no-fail --out=docs/review/encoding-audit-2026-06-13.json`：通过，blocking 为 0。
