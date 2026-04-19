# Global Rules

该文件是 PMAIOS 当前生效的全局治理规则真源。对话中形成的长期规则，必须沉淀到这里，不能只停留在聊天记录里。

## rule-input-inbox
- createdAt: 2026-04-17T00:00:00.000Z
- status: active
- source: manual-bootstrap
- sessionId: n/a
- messageId: n/a
- subprojectId: platform
- captureMode: manual
- canonicalRule:
  - `docs/sources/inbox/` 是 PMAIOS 的统一输入落点。
  - 会议纪要、需求草稿、外部材料、人工结论等新增输入，先进入 inbox，再进入分类、治理与版本化流程。
  - 未进入 inbox 的输入，不应直接视为正式治理输入。

## rule-open-source-first
- createdAt: 2026-04-18T00:00:00.000Z
- status: active
- source: user-directive
- sessionId: n/a
- messageId: n/a
- subprojectId: platform
- captureMode: manual
- canonicalRule:
  - 在进入实现阶段前，优先检索、评估并推荐成熟的开源工具、开源组件或托管服务，不允许默认直接手搓代码。
  - 只有当现成方案在许可、成本、可维护性、集成边界、性能或安全要求上明显不满足时，才允许自研。
  - 如果不采用现成方案，必须明确写出未采用原因、替代方案比较和自研边界，避免重复造轮子。
  - 产品、架构、workflow、agent 与 capability 设计默认遵守 `open-source-first / buy-before-build / no-handcrafted-by-default`。

## rule-doc-sync
- createdAt: 2026-04-19T00:00:00.000Z
- status: active
- source: user-directive
- sessionId: n/a
- messageId: n/a
- subprojectId: platform
- captureMode: manual
- canonicalRule:
  - 对话中一旦形成明确需求、执行结论、阶段进展或规则变更，必须在同一轮工作内同步更新受治理文档，不能只停留在聊天里。
  - 文档更新优先落到真源位置，例如 `docs/operations/`、`docs/memory/`、`docs/tasks/`、`docs/templates/`、`config/`。
  - 若执行内容与既有文档不一致，应优先改文档与实现，避免文档长期滞后于真实系统状态。

## rule-version-governance
- createdAt: 2026-04-19T00:00:00.000Z
- status: active
- source: user-directive
- sessionId: n/a
- messageId: n/a
- subprojectId: platform
- captureMode: manual
- canonicalRule:
  - PMAIOS final version numbers are assigned by actual development and verification result, not by planning-time labels.
  - Current active product version is `v0.4`.
  - Canonical version plan is `docs/operations/pmaios-version-plan.md`.
  - Version governance is `docs/operations/version-governance.md`.
  - Daily progress snapshot is `docs/operations/current-version-progress.md`.
  - New requirements must update the plan through requirement change control before implementation unless they are urgent verification blockers.

## rule-daily-version-progress
- createdAt: 2026-04-19T00:00:00.000Z
- status: active
- source: user-directive
- sessionId: n/a
- messageId: n/a
- subprojectId: platform
- captureMode: manual
- canonicalRule:
  - Every working day, maintain a clear current-version progress snapshot.
  - The snapshot must show current version, cycle dates, completed work, in-progress work, open blockers, verification evidence, and next execution order.
  - When the user asks for current progress, answer from `docs/operations/current-version-progress.md` first.

## rule-project-pm-output-first
- createdAt: 2026-04-19T00:00:00.000Z
- status: active
- source: user-directive
- sessionId: n/a
- messageId: n/a
- subprojectId: platform
- captureMode: manual
- canonicalRule:
  - Current project PM outputs that can be used directly in daily product work have priority over Product Chief abstractions and engineering hardening.
  - Product Agent, product skill, design skill, and documentation output are the v0.4 mainline.
  - Product Chief is the review/governance layer unless the user explicitly asks for supervisor-level planning.
  - Multi-agent review is core v0.4 when it validates generated PM outputs; realtime/model-backed agent execution can remain future work.

## rule-no-chat-backfill
- createdAt: 2026-04-19T00:00:00.000Z
- status: active
- source: user-directive
- sessionId: n/a
- messageId: n/a
- subprojectId: platform
- captureMode: manual
- canonicalRule:
  - 当用户明确要求“不再找聊天记录”后，后续工作不得继续把历史聊天检索作为主路径。
  - 后续需求回溯、执行判断与实现推进，应优先基于当前仓库真源文档、配置、代码、requirements、roadmap 与运行状态。
