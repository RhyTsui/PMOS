# 需求沟通 P1 Shadow 部署观察计划

## 1. 部署状态

### P1 提交清单

| Commit | 描述 | 文件数 | 状态 |
|--------|------|--------|------|
| `c5647179` | feat: 需求沟通链路 — 新增确认器/状态管理/回归测试 | 8 | ✅ 已提交 |
| `759aa9ec` | fix: demand-intake-gate 小幅修正 | 1 | ✅ 已提交 |
| `b37c171c` | fix(demand): 修复需求单创建错误处理 | 1 | ✅ 已提交 |

### 核心文件清单

**新增文件**：
- `lib/demand-intake-structurer.ts` - 需求结构化逻辑
- `lib/demand-intake-confirmation.ts` - 确认卡和追问卡生成
- `lib/demand-capability-status.ts` - 能力状态判断
- `scripts/demand-intake-p1-rc-regression.ts` - P1-RC 回归测试
- `scripts/demand-intake-regression.ts` - 需求接入回归测试

**修改文件**：
- `types/index.ts` - DemandPoolItem 添加 intake 关联字段
- `lib/demand-pool-store.ts` - normalizeItem 支持新字段
- `lib/chat-pipeline/demand-intake-gate.ts` - 使用 structurer
- `lib/chat-pipeline/open-answer-stage.ts` - 消费 gate message
- `app/api/chat/route.ts` - 集成建单逻辑

## 2. Feature Flag 配置（Shadow 模式）

```typescript
{
  enableDemandIntakeGate: true,              // ✅ 启用 gate
  enableDemandIntakeShadow: true,            // ✅ shadow 模式（不改变回答）
  enableDemandPoolCreateOnConfirm: false,    // ❌ 不自动建单
  enableBusinessDocumentUrlBypass: true,     // ✅ 业务文档 URL 不被 public web 抢走
  enableDemandDocumentParse: false,          // ❌ 不解析文档内容
  enableDemandCapabilityStatusCheck: false   // ❌ 不启用能力状态检查
}
```

**关键配置说明**：
- `enableDemandIntakeShadow: true`：所有 demand intake 逻辑只记录 metadata，不改变实际回答
- `enableDemandPoolCreateOnConfirm: false`：即使用户确认，也不会创建 DemandPoolItem
- 这是最安全的部署配置，可以观察 demand intake 的识别准确率而不影响用户体验

## 3. 观察指标

### 3.1 识别准确率

**监控 Process Event**：
```typescript
{
  type: 'intent.detected',
  label: '需求门禁',
  output: {
    serviceIntakeCandidate: boolean,
    serviceType: 'monitoring_callback' | 'data_collection' | null,
    shadow: true,
    intakeDraftStatus: 'collecting' | 'ready_for_confirmation',
    missingInputsCount: number
  }
}
```

**观察目标**：
1. **误判率**：非需求意图被识别为 demand intake 的比例
   - 预期：0%（普通对话、报表查询、诊断、包查询等不应进入 demand intake）
   
2. **漏判率**：真正的需求意图未被识别的比例
   - 预期：低（监测回传对接、采集数据需求应被正确识别）

3. **serviceType 分布**：
   - `monitoring_callback`：监测回传对接需求
   - `data_collection`：采集数据需求
   - `null`：无法识别或不是需求意图

### 3.2 槽位填充质量

**监控数据**：
```typescript
{
  collectedSlots: {
    project: { value: string, source: 'business_context' | 'message' },
    media: { value: string, source: 'business_context' | 'message' },
    integration_type: { value: string, source: 'message' },
    document_url: { value: string, source: 'message' },
    // ... 其他槽位
  },
  missingInputs: string[],
  intakeDraftStatus: 'collecting' | 'ready_for_confirmation'
}
```

**观察目标**：
1. **槽位提取准确率**：从消息和业务上下文中提取的槽位值是否正确
2. **缺失项数量分布**：平均每个需求需要补充多少信息
3. **ready_for_confirmation 比例**：有多少需求在首次消息后就信息齐全

### 3.3 安全检测

**监控数据**：
```typescript
{
  securityFindings: Array<{
    type: 'api_key' | 'secret' | 'token' | 'password',
    hint: string
  }>,
  riskWarnings: string[]
}
```

**观察目标**：
1. **敏感信息检测率**：是否正确检测到 API Key / Secret / Token / 密码
2. **误报率**：非敏感信息被误判为敏感信息的比例

### 3.4 CaseFrame 更新

**监控数据**：
```typescript
caseFrame.metadata.demandIntake = {
  serviceIntakeCandidate: boolean,
  serviceType: string,
  missingInputs: string[],
  intakeDraftStatus: string,
  collectedSlots: Record<string, any>,
  artifacts: Array<any>
}
```

**观察目标**：
1. **CaseFrame 更新频率**：有多少对话触发了 CaseFrame 的 demandIntake metadata 更新
2. **stage 转换**：`clarifying` → `waiting_user` 的转换比例

## 4. 观察方法

### 4.1 日志分析

**关键日志点**：
```typescript
// demand-intake-gate.ts
console.log('[demand-intake-gate] serviceType:', serviceType);
console.log('[demand-intake-gate] collectedSlots:', collectedSlots);
console.log('[demand-intake-gate] missingInputs:', missingInputs);
console.log('[demand-intake-gate] intakeDraftStatus:', intakeDraftStatus);
```

**分析方法**：
1. 收集生产环境日志
2. 按 `serviceIntakeCandidate` 分组统计
3. 分析 `serviceType` 分布
4. 统计 `missingInputsCount` 分布

### 4.2 Trace 分析

**关键 Trace 字段**：
```typescript
{
  traceId: string,
  conversationId: string,
  processEvents: [
    {
      type: 'intent.detected',
      label: '需求门禁',
      output: {
        serviceIntakeCandidate: boolean,
        serviceType: string,
        shadow: true,
        intakeDraftStatus: string
      }
    }
  ]
}
```

**分析方法**：
1. 从 Trace 系统中查询包含 `需求门禁` 事件的 trace
2. 分析每个 trace 的完整流程
3. 检查是否有误判或漏判

### 4.3 用户反馈收集

**收集方式**：
1. 在 Chat 界面添加反馈按钮
2. 收集用户对 demand intake 识别结果的评价
3. 记录用户报告的问题案例

## 5. 观察周期

### 阶段 1：短期观察（1 周）

**目标**：
- 验证 shadow 模式不影响现有功能
- 收集初步的识别准确率数据
- 发现明显的误判/漏判问题

**指标**：
- 系统稳定性：无报错、无性能下降
- 识别准确率：误判率 < 5%，漏判率 < 10%

### 阶段 2：中期观察（2-4 周）

**目标**：
- 收集足够的数据进行统计分析
- 优化槽位提取逻辑
- 调整识别规则

**指标**：
- 识别准确率：误判率 < 2%，漏判率 < 5%
- 槽位填充质量：平均缺失项 < 3 个
- 用户满意度：正面反馈 > 80%

### 阶段 3：长期观察（1-2 月）

**目标**：
- 验证长期稳定性
- 评估是否切换到 active 模式
- 评估是否启用自动建单

**指标**：
- 识别准确率：误判率 < 1%，漏判率 < 3%
- 系统稳定性：无重大问题
- 用户满意度：正面反馈 > 90%

## 6. 切换标准

### 从 Shadow 切换到 Active 模式

**条件**：
1. ✅ 观察周期 ≥ 2 周
2. ✅ 误判率 < 2%
3. ✅ 漏判率 < 5%
4. ✅ 系统稳定性：无报错、无性能下降
5. ✅ 用户满意度：正面反馈 > 80%

**切换步骤**：
```typescript
{
  enableDemandIntakeShadow: false  // 切换到 active 模式
}
```

### 从 Active 模式切换到自动建单

**条件**：
1. ✅ Active 模式观察周期 ≥ 4 周
2. ✅ 识别准确率：误判率 < 1%，漏判率 < 3%
3. ✅ 用户确认率 > 70%（用户确认创建需求单的比例）
4. ✅ 系统稳定性：无重大问题
5. ✅ 用户满意度：正面反馈 > 90%

**切换步骤**：
```typescript
{
  enableDemandPoolCreateOnConfirm: true  // 启用自动建单
}
```

## 7. 回滚方案

### 回滚触发条件

1. ❌ 误判率 > 10%
2. ❌ 漏判率 > 20%
3. ❌ 系统稳定性问题：报错率 > 1% 或性能下降 > 20%
4. ❌ 用户满意度：负面反馈 > 30%

### 回滚步骤

```typescript
{
  enableDemandIntakeGate: false  // 完全关闭 demand intake gate
}
```

**回滚后**：
1. 分析问题原因
2. 修复代码
3. 重新部署 shadow 模式
4. 重新开始观察周期

## 8. 监控告警

### 告警规则

1. **误判率告警**：误判率 > 5% 时触发
2. **漏判率告警**：漏判率 > 10% 时触发
3. **错误率告警**：demand intake 相关错误 > 1% 时触发
4. **性能告警**：demand intake 处理时间 > 500ms 时触发

### 告警处理

1. 立即检查日志和 Trace
2. 分析问题原因
3. 必要时回滚到安全配置
4. 修复后重新部署

## 9. 总结

### Shadow 模式优势

1. **零风险**：不影响现有功能，不改变用户体验
2. **数据收集**：可以收集真实的识别准确率数据
3. **问题发现**：可以在不影响用户的情况下发现和修复问题
4. **渐进式部署**：可以逐步切换到 active 模式和自动建单

### 关键成功指标

1. ✅ 系统稳定性：无报错、无性能下降
2. ✅ 识别准确率：误判率 < 2%，漏判率 < 5%
3. ✅ 用户满意度：正面反馈 > 80%
4. ✅ 槽位填充质量：平均缺失项 < 3 个

### 下一步

1. **部署 shadow 模式**：使用上述配置部署到生产环境
2. **开始观察**：按照观察计划收集数据
3. **定期评审**：每周评审观察数据，调整优化策略
4. **准备切换**：达到切换标准后，准备切换到 active 模式

---

**部署日期**: 2026-06-22  
**部署状态**: ✅ 准备就绪  
**观察周期**: 1-2 月  
**评审频率**: 每周
