# Review Committee Template

## 评审角色

1. 架构评审
2. 产品评审
3. 技术评审
4. 数据评审
5. 风险评审

---

## 单角色输出格式

```yaml
role: architecture
issues:
  - title: 示例问题
    description: 问题说明
    impact: 可能影响
    recommendation: 修改建议
    expectedAnswer: 标准答案
    decision: Conditional
summary: 简要结论
```

---

## 聚合输出格式

```yaml
overallConclusion: 总体结论
nextStage: true
reworkRequired: false
roles:
  - role: architecture
    issues: []
    summary: Pass
```

---

## Decision 取值

- Pass
- Conditional
- Reject

---

## 通过标准

- 所有关键风险已识别
- 关键问题给出明确 expectedAnswer
- 未通过项必须触发返工建议
