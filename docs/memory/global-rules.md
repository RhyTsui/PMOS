# Global Rules

此文件记录从用户对话中沉淀出的全局规则。

规则含义：

- 已被当前仓库接受并默认生效
- 默认作为平台级 truth-source 参与后续上下文装载
- 后续若被新决策覆盖，应通过新增记录而不是静默删除

## rule-input-inbox
- createdAt: 2026-04-17T00:00:00.000Z
- status: active
- source: manual-bootstrap
- sessionId: n/a
- messageId: n/a
- subprojectId: platform
- captureMode: manual
- canonicalRule:
  - `docs/sources/inbox/` 是 PMAIOS 的唯一人工输入投递目录
  - 新的会议纪要、版本分析、需求分析等原始材料，先投递到 inbox，再由系统整理搬运
