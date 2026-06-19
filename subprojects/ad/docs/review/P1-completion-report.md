# P1 任务完成报告

**日期**: 2026-06-18  
**执行人**: AI Assistant  
**状态**: ✅ 全部完成

---

## P1-1: 提取硬编码 skill ID 到配置

**问题**: route.ts 中硬编码了 package skill ID 数组  
**解决方案**: 创建共享常量 PACKAGE_SKILL_IDS

### 改动文件

1. **`src/lib/chat-pipeline/package-stage.ts`**
   - 导出 `PACKAGE_SKILL_IDS` 常量
   ```typescript
   export const PACKAGE_SKILL_IDS = new Set([
     'package_status_query_skill',
     'package_delivery_execution_skill',
   ]);
   ```

2. **`src/app/api/chat/route.ts`**
   - 导入并使用 `PACKAGE_SKILL_IDS`
   - 替换硬编码数组：
   ```typescript
   // Before
   if (['package_status_query_skill', 'package_delivery_execution_skill'].includes(selectedSkill.skill_id))
   
   // After
   if (PACKAGE_SKILL_IDS.has(selectedSkill.skill_id))
   ```

**优势**:
- 单一事实来源，避免重复定义
- 使用 Set 提高查找性能
- 易于维护和扩展

---

## P1-2: 动态 import → 静态 import

**问题**: understanding-stage.ts 中使用动态 import，影响性能和代码可读性  
**解决方案**: 改为顶部静态 import

### 改动文件

**`src/lib/chat-pipeline/understanding-stage.ts`**

1. 添加静态导入：
   ```typescript
   import { generateServiceProposal } from '@/contracts/service-proposal';
   import { discoverServices } from '@/lib/service-discovery';
   import { fromLegacyServiceIntent } from '@/contracts/service-catalog';
   import { deriveRequestRouteDecision } from '@/lib/request-understanding';
   import { getActiveCaseFrame, createCaseFrame } from '@/lib/case-frame-store';
   ```

2. 移除动态 import：
   ```typescript
   // Removed
   const { generateServiceProposal } = await import('@/contracts/service-proposal');
   const { discoverServices } = await import('@/lib/service-discovery');
   const { fromLegacyServiceIntent } = await import('@/contracts/service-catalog');
   const { deriveRequestRouteDecision } = await import('@/lib/request-understanding');
   ```

**优势**:
- 提升性能（避免运行时动态加载）
- 更好的类型检查
- 代码更清晰，依赖关系明确
- 支持 tree-shaking

---

## P1-3: Evidence Ledger 持久化与 CaseFrame 集成

**问题**: Evidence Ledger 使用临时的 conversationId 作为 caseId，无法与 CaseFrame 关联  
**解决方案**: 在 understanding-stage 中创建/获取 CaseFrame，并切换到正确的 Evidence Ledger

### 改动文件

1. **`src/lib/chat-pipeline/pipeline-types.ts`**
   - 在 `ChatPipelineContext` 中添加 `caseFrame?: CaseFrame` 字段

2. **`src/lib/case-frame-store.ts`**
   - 导入 `createCaseFrame` 契约函数
   - 实现 `createCaseFrame` 存储函数：
   ```typescript
   export async function createCaseFrame(scopeKey: string, params: {
     conversationId: string;
     initialMessage?: string;
     messageId?: string;
     serviceType?: string;
     realGoal?: string;
     priority?: 'low' | 'medium' | 'high' | 'urgent';
   }): Promise<CaseFrame>
   ```

3. **`src/lib/chat-pipeline/understanding-stage.ts`**
   - 添加静态导入：`import { getActiveCaseFrame, createCaseFrame } from '@/lib/case-frame-store'`
   - 在 `UnderstandingResult` 接口中添加 `caseFrame?: CaseFrame` 字段
   - 在理解阶段获取/创建 CaseFrame：
   ```typescript
   // 获取当前会话的活跃 CaseFrame，如果没有则创建新的
   let caseFrame = await getActiveCaseFrame(userScopeKey, conversationId);
   if (!caseFrame) {
     caseFrame = await createCaseFrame(userScopeKey, {
       conversationId,
       serviceType: route.intent_type as any,
       realGoal: semanticFrame?.fieldDefinition?.targetTerm || message,
       priority: 'medium',
     });
   }
   ```
   - 在返回结果中包含 `caseFrame`

4. **`src/app/api/chat/route.ts`**
   - 将 `evidenceCaseId` 从 `const` 改为 `let`
   - 从 `understandingResult` 中解构 `caseFrame`
   - 将 `caseFrame` 添加到 `pipelineCtx`
   - 在理解阶段后切换 Evidence Ledger：
   ```typescript
   // understanding-stage 产出了 CaseFrame，现在切换到正确的 Evidence Ledger
   if (caseFrame?.caseId) {
     const correctEvidenceCaseId = caseFrame.caseId;
     if (correctEvidenceCaseId !== evidenceCaseId) {
       // 从存储中加载对应的 Evidence Ledger
       const correctLedger = await getEvidenceLedgerByCase(userScopeKey, correctEvidenceCaseId)
         .catch(() => createEmptyEvidenceLedger());
       streamIO.setEvidenceLedger(correctLedger);
       // 更新本地的 evidenceCaseId 引用（用于后续保存）
       evidenceCaseId = correctEvidenceCaseId;
     }
   }
   ```

### 工作流程

```
1. 请求进入 → 使用临时 evidenceCaseId (conv-${conversationId})
   ↓
2. Understanding Stage → 创建/获取 CaseFrame
   ↓
3. 切换 Evidence Ledger → 使用 CaseFrame.caseId
   ↓
4. 后续 stages → 使用正确的 Evidence Ledger
   ↓
5. 请求结束 → 保存到正确的 CaseFrame
```

**优势**:
- Evidence Ledger 与 CaseFrame 正确关联
- 支持跨请求的证据累积
- 符合架构设计（CaseFrame 作为服务案例的完整生命周期）
- 为后续的 Feedback Loop 和服务沉淀奠定基础

---

## 验证结果

### TypeScript 类型检查
```bash
pnpm ts-check
✅ 通过，无错误
```

### 代码质量
- ✅ 无硬编码
- ✅ 静态导入，依赖关系明确
- ✅ 类型安全
- ✅ 符合架构设计

---

## 架构影响

### Evidence Ledger 生命周期

**Before**:
```
Request → Evidence Ledger (conv-${conversationId}) → Save
```

**After**:
```
Request → Evidence Ledger (临时) → Understanding Stage → CaseFrame → 
Evidence Ledger (caseFrame.caseId) → Save
```

### CaseFrame 集成点

1. **Understanding Stage**: 创建/获取 CaseFrame
2. **Evidence Ledger**: 使用 CaseFrame.caseId 作为存储键
3. **Pipeline Context**: 传递 CaseFrame 给后续 stages
4. **Future**: 可在其他 stages 中更新 CaseFrame 状态

---

## 后续建议

### P2 改进项（可选）

1. **类型精确化**: 减少 `any` 和 `as` 类型断言
   - `route.intent_type as any` → 定义明确的类型映射
   - `compiledContext: any` → 定义 CompiledContextPackage 类型

2. **CaseFrame 状态更新**: 在后续 stages 中更新 CaseFrame
   - Planning Stage: 更新 `stage` 为 `clarifying` 或 `ready_to_execute`
   - Execution Stage: 更新 `stage` 为 `executing`
   - Result Stage: 更新 `stage` 为 `resolved`，添加 `deliverables`

3. **Feedback Loop 集成**: 在 CaseFrame resolved 时触发沉淀
   - 已在 `saveCaseFrame` 中实现基础逻辑
   - 可进一步完善沉淀策略

---

## 总结

✅ **P1-1**: 提取硬编码 skill ID → 完成  
✅ **P1-2**: 动态 import → 静态 import → 完成  
✅ **P1-3**: Evidence Ledger 与 CaseFrame 集成 → 完成  

所有 P1 任务已完成，代码质量提升，架构一致性增强。
