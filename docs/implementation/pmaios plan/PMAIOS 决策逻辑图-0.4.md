[用户问题]
   ↓
workflow不执行 / 系统混乱
   ↓
────────────────────────────
L1：执行问题识别
→ 需要 Control Plane
→ 选 LangGraph DAG
────────────────────────────
L2：权限冲突问题
→ Hermes 不能参与 routing
→ 降级为 policy layer
────────────────────────────
L3：能力混乱问题
→ prompt / AI能力复杂
→ 引入 Dify（能力层）
────────────────────────────
L4：系统自动化问题
→ 外部系统联动
→ 引入 n8n（automation layer）
────────────────────────────
L5：系统不可观测
→ 加 Observability Layer
────────────────────────────
L6：无法进化
→ 加 Meta Layer（review + evolution）
────────────────────────────
最终：
AI OS = Control + Policy + Execution + Capability + Automation + Meta