# 需求沟通 P1+P2-1 本地观察状态

## 当前配置

```typescript
enableDemandPoolCreateOnConfirm: true  // 默认启用
enableDemandIntakeShadow: true          // shadow 模式
enableDemandIntakeGate: true            // gate 启用
```

## 已完成提交

```
f2839c1f feat(demand): 启用自动建单标志，完成 P1+P2-1
```

## 回归测试结果

✅ **10/10 通过**

| # | 测试用例 | 结果 |
|---|---------|------|
| 1 | 你好 → chat_answer | ✅ |
| 2 | 昨天巨量激活多少 → report_query | ✅ |
| 3 | 查日报 → report_query | ✅ |
| 4 | 为什么昨天 ROI 下降 → diagnosis | ✅ |
| 5 | 获取可用包并发起联调 → package | ✅ |
| 6 | 现在北京天气如何 → public web | ✅ |
| 7 | https://example.com → public web | ✅ |
| 8 | 文档链接 + 监测回传对接 | ✅ |
| 9 | 文档链接 + 采集数据需求 | ✅ |
| 10 | 用户发送 Key/Secret/Token/密码 | ✅ |

## 观察要点

### 1. 识别准确率
- 监测回传对接需求识别
- 采集数据需求识别
- 非需求意图不误判

### 2. 槽位填充质量
- 项目、媒体、对接类型等槽位提取
- 缺失项追问是否合理
- 确认卡展示是否完整

### 3. 建单流程
- 用户确认后是否成功创建 DemandPoolItem
- caseId、conversationId、evidenceRefs 关联是否正确
- intakeDraftStatus 状态转换是否正常

### 4. 安全检测
- 敏感信息（Key/Secret/Token/密码）检测
- 风险提示是否展示
- 明文是否被过滤

## 环境变量覆盖

如需临时关闭自动建单，可设置：
```bash
export XIAOQIAO_ENABLE_DEMAND_POOL_CREATE=false
```

## 下一步

1. 本地观察 1-2 周，收集真实数据
2. 分析识别准确率和用户反馈
3. 如效果良好，可考虑：
   - 关闭 shadow 模式（`enableDemandIntakeShadow: false`）
   - 进入 P2-2 实现（编辑回调、后台管理页）

---

**状态**: ✅ 已启用，可开始本地观察
**日期**: 2026-06-22
**Commit**: f2839c1f
