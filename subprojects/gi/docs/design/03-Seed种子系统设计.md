# 03-Seed 种子系统设计

> 版本：1.0 | 创建时间：2026-06-18 | 状态：设计中
> Seed 系统是 GI 的核心发动机。采集上限由种子质量决定，不是由爬虫数量决定。

---

## 一、核心思想

```
❌ 传统爬虫思维：源 → 采集 → 入库（被动、有限）
✅ 种子驱动思维：种子 → 发现线索 → 多路径采集 → 产出 → 种子进化（主动、自增长）
```

> **种子决定上限，不是爬虫决定上限。**
>
> 种子系统必须做到：
> 1. 知道该找什么（种子覆盖）
> 2. 知道什么有效（种子评分）
> 3. 自动淘汰无效种子（自进化）
> 4. 自动发现新方向（种子扩展）
> 5. 知道自己漏了什么（漏采检测）

---

## 二、四类种子总览

| 种子类型 | 是什么 | 驱动什么 | 生命周期 |
|---------|--------|---------|---------|
| **实体种子 EntitySeed** | 游戏名/公司名/人名 | 定向搜索 + 内容匹配 | 长期存在，别名扩展 |
| **事件种子 EventSeed** | 关注某类事件（版号/上线/...） | RSS 过滤 + 搜索构造 | 短期有效，事件结束可淘汰 |
| **话题种子 TopicSeed** | 话题标签/趋势方向 | 搜索流 + 话题追踪 | 随趋势变化，rising/stable/declining |
| **源种子 SourceSeed** | 发现新源的线索 | 源发现流程 | 验证后转为 IntelSource |

---

## 三、种子生命周期

```
发现 → 激活 → 使用 → 评估 → 进化/淘汰
 │       │       │       │        │
 ↓       ↓       ↓       ↓        ↓
新建    加入调度  驱动采集  评分更新  评分≥阈值：保持
                                  评分<阈值：降级
                                  连续N次无效：休眠
                                  长期休眠：淘汰
                                  高分种子：扩展新种子
```

### 状态机

```
            ┌──────────┐
     ┌─────→│  active   │←─────┐
     │      └────┬─────┘      │
     │           │            │
     │     评分<阈值      评分恢复
     │           │            │
     │      ┌────▼─────┐      │
     │      │ degraded  │──────┘
     │      └────┬─────┘
     │           │
     │    连续N次无效
     │           │
     │      ┌────▼─────┐
     │      │  dormant  │
     │      └────┬─────┘
     │           │
     │    超过休眠期限
     │           │
     │      ┌────▼─────┐
     └──────│  retired  │
            └──────────┘
```

---

## 四、种子评分模型

### 4.1 评分公式

```typescript
/**
 * 种子质量分 0-100
 * 每次种子驱动采集后，根据结果更新评分
 */
function calculateSeedScore(seed: Seed, result: CollectionResult): number {
  const currentScore = seed.score;

  // 基础分变化
  let delta = 0;

  // ① 产出因子（权重 40%）
  //    种子驱动采集后，产出了多少有效证据
  if (result.newEvidenceCount > 0) {
    delta += 40 * Math.min(1.0, result.newEvidenceCount / EXPECTED_PER_SEED);
  } else {
    delta -= 10;  // 零产出惩罚
  }

  // ② 质量因子（权重 30%）
  //    产出证据的平均 impactScore 高不高
  const avgImpact = result.avgImpactScore;  // 0-100
  delta += 30 * (avgImpact / 100);

  // ③ 新鲜度因子（权重 15%）
  //    是否发现了之前没见过的新信息
  if (result.noveltyRate > 0.5) {
    delta += 15 * result.noveltyRate;
  }

  // ④ 效率因子（权重 15%）
  //    单位时间/请求的产出效率
  const efficiency = result.newEvidenceCount / result.requestCount;
  delta += 15 * Math.min(1.0, efficiency / EXPECTED_EFFICIENCY);

  // 衰减机制：长期不使用的种子缓慢降分
  const daysSinceLastUse = daysBetween(seed.lastUsedAt, now());
  if (daysSinceLastUse > 7) {
    delta -= Math.min(20, daysSinceLastUse * 0.5);
  }

  // 更新评分（带惯性，不剧烈波动）
  const newScore = currentScore * 0.7 + (currentScore + delta) * 0.3;
  return clamp(newScore, 0, 100);
}
```

### 4.2 评分参数配置

```yaml
# src/config/seed-scoring.yaml

scoring:
  # 各因子权重
  weights:
    output: 0.40        # 产出因子
    quality: 0.30       # 质量因子
    novelty: 0.15       # 新鲜度因子
    efficiency: 0.15    # 效率因子

  # 期望值（用于归一化）
  expectations:
    evidence_per_seed: 5        # 期望每个种子产出 5 条新证据
    expected_efficiency: 0.5    # 期望效率（每条请求 0.5 条新证据）

  # 惩罚
  penalties:
    zero_output: -10            # 零产出惩罚
    max_decay_per_day: -0.5     # 每日衰减上限

  # 评分更新
  update:
    inertia: 0.7                # 历史评分权重（越大越稳定）
    delta_weight: 0.3           # 本次评分权重

# 状态转换阈值
thresholds:
  active_min_score: 30          # 低于此分 → degraded
  degraded_min_score: 15        # 低于此分 → dormant
  dormant_max_days: 30          # 休眠超过此天数 → retired
  consecutive_fail_limit: 5     # 连续失败次数 → dormant

  # 扩展触发
  expansion_min_score: 80       # 高于此分 → 触发种子扩展
  expansion_max_per_cycle: 10   # 每次评估周期最多扩展的种子数
```

---

## 五、自进化引擎

### 5.1 进化周期

```
每周（或每 N 次采集）执行一次种子评估：

1. 评分更新：根据最近采集结果更新所有种子评分
2. 状态转换：根据阈值执行状态转换
3. 淘汰清理：移除 retired 种子（保留历史记录）
4. 种子扩展：高分种子触发扩展，发现新种子
5. 漏采检测：检查是否漏掉了应该覆盖的内容
```

### 5.2 种子扩展规则

> 高分种子 = "这个方向很有效" → 围绕它发现更多种子

**实体种子扩展**：
```
EntitySeed("米哈游", score=85)
    ↓ 扩展
    ├── EntitySeed("崩坏：星穹铁道", score=60, 新游戏)
    ├── EntitySeed("绝区零", score=60, 新游戏)
    ├── EntitySeed("HoYoverse", score=60, 海外品牌名)
    └── EventSeed("米哈游+融资", score=50, 新事件方向)
```

**事件种子扩展**：
```
EventSeed("版号", score=90)
    ↓ 扩展
    ├── EventSeed("进口版号", score=60, 细分方向)
    ├── EventSeed("版号+撤回", score=60, 关联事件)
    └── TopicSeed("版号政策收紧", score=50, 话题维度)
```

**话题种子扩展**：
```
TopicSeed("AI+游戏", trendDirection=rising)
    ↓ 扩展
    ├── EntitySeed("AI NPC 公司A", score=60, 相关实体)
    ├── EventSeed("AI+应用", score=60, 事件方向)
    └── TopicSeed("AI 美术", score=50, 细分话题)
```

**扩展方式**：
1. **LLM 扩展**：让 LLM 基于高分种子联想相关种子
2. **共现扩展**：从采集结果中提取与种子共现的新实体/关键词
3. **搜索建议**：利用搜索引擎的 related searches
4. **跨类型扩展**：从实体 → 事件、事件 → 话题等

```typescript
interface ExpansionStrategy {
  name: string;
  applicableTo: SeedType[];
  trigger: 'score_threshold' | 'periodic' | 'on_demand';
  expand(seed: Seed): Promise<NewSeedCandidate[]>;
}

// 示例：LLM 扩展策略
class LLMExpansionStrategy implements ExpansionStrategy {
  name = 'llm_expansion';
  applicableTo = ['entity', 'event', 'topic'];
  trigger = 'score_threshold';

  async expand(seed: Seed): Promise<NewSeedCandidate[]> {
    const prompt = `
      当前高效种子：${seed.text}（类型：${seed.seedType}，评分：${seed.score}）
      这个种子最近发现了 ${seed.discoveryCount} 条有效情报。
      
      请推荐 5-10 个相关的新种子，覆盖：
      1. 相关实体（游戏/公司/人名）
      2. 相关事件方向
      3. 相关话题趋势
      
      输出 JSON 数组。
    `;
    const response = await llm.generate(prompt);
    return parseAndValidate(response);
  }
}
```

### 5.3 漏采检测

> **漏采是最大的失败。** 系统必须能检测到自己漏掉了什么。

**方法 1：交叉验证**
```
同一事件在 A 源出现了，B 源也应该出现但没采到 → B 源可能有问题

检测方式：
- 每周对比不同源的事件覆盖率
- 如果某源的事件类型覆盖率突然下降 → 告警
```

**方法 2：搜索兜底**
```
定期用高优先级实体种子做一次全量搜索（不走 RSS/订阅）：
- 如果搜索发现了之前没采到的信息 → 说明常规采集有遗漏
- 将遗漏结果反向归因到具体源 → 标记源健康问题
```

**方法 3：人工反馈**
```
用户标记"这条情报系统应该采到但没采到" →
- 分析为什么没采到：
  a. 没有对应的种子？→ 需要新增种子
  b. 种子有但源没覆盖？→ 需要新增源
  c. 源有但采集失败了？→ 需要修复采集器
  d. 采集到了但被过滤了？→ 需要调整过滤规则
```

```typescript
interface MissedCoverageReport {
  detectedAt: string;
  method: 'cross_validation' | 'search_fallback' | 'manual_feedback';
  description: string;
  
  // 归因分析
  rootCause?: 'missing_seed' | 'missing_source' | 'collector_failure' | 'filter_issue';
  
  // 修复建议
  suggestedAction: {
    type: 'add_seed' | 'add_source' | 'fix_collector' | 'adjust_filter';
    detail: string;
  };
}
```

---

## 六、种子调度策略

### 6.1 调度原则

```
种子不是全量使用，而是按优先级调度：

1. P0 种子：每次采集都使用（高优先级实体 + 活跃事件种子）
2. P1 种子：按调度周期使用（如每天一次）
3. P2 种子：低频使用（如每周一次）
4. 衰减种子：仅用于验证（确认是否应该淘汰）
```

### 6.2 种子选择算法

```typescript
/**
 * 为一次采集任务选择最优种子组合
 * 
 * 考虑因素：
 * 1. 种子评分（质量）
 * 2. 种子新鲜度（最近是否用过）
 * 3. 采集预算（本次能发多少请求）
 * 4. 覆盖多样性（不要全集中在一个方向）
 */
function selectSeedsForCollection(params: {
  seeds: Seed[];
  budget: number;          // 最大请求数
  sourceType: SourceType;  // 目标源类型
  lastUsedMap: Map<string, Date>;  // 种子最近使用时间
}): Seed[] {
  const { seeds, budget, lastUsedMap } = params;

  // 1. 按评分排序
  const scored = seeds
    .filter(s => s.status === 'active' || s.status === 'degraded')
    .map(s => ({
      seed: s,
      // 综合得分 = 质量分 × 0.5 + 新鲜度分 × 0.3 + 多样性分 × 0.2
      compositeScore: calculateComposite(s, lastUsedMap),
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore);

  // 2. 贪心选择：在预算内选最高分的种子
  const selected: Seed[] = [];
  let remainingBudget = budget;

  for (const item of scored) {
    if (remainingBudget <= 0) break;
    const cost = estimateRequestCost(item.seed, params.sourceType);
    if (cost > remainingBudget) continue;
    selected.push(item.seed);
    remainingBudget -= cost;
  }

  return selected;
}
```

### 6.3 调度配置

```yaml
# src/config/seed-scheduling.yaml

scheduling:
  # 种子分级使用策略
  tiers:
    p0:  # 每次都用
      min_score: 80
      max_age_days: null  # 不限
      always_include: true

    p1:  # 每天用一次
      min_score: 50
      max_age_days: 1
      cron: '0 8 * * *'   # 每天 8 点

    p2:  # 每周用一次
      min_score: 30
      max_age_days: 7
      cron: '0 8 * * 1'   # 每周一 8 点

  # 采集预算
  budget:
    max_requests_per_cycle: 100
    max_requests_per_source: 20
    max_requests_per_seed: 10

  # 多样性控制
  diversity:
    max_same_type_ratio: 0.5    # 同类型种子不超过 50%
    min_entity_coverage: 0.8    # P0 实体覆盖率不低于 80%
```

---

## 七、种子管理 API

```typescript
// 种子 CRUD
GET    /api/seeds                    # 列表（支持筛选）
POST   /api/seeds                    # 创建种子
GET    /api/seeds/:id                # 详情
PUT    /api/seeds/:id                # 更新
DELETE /api/seeds/:id                # 删除

// 种子操作
POST   /api/seeds/:id/evaluate       # 手动触发评分
POST   /api/seeds/:id/expand         # 手动触发扩展
POST   /api/seeds/batch/evaluate     # 批量评估
POST   /api/seeds/batch/expand       # 批量扩展

// 种子分析
GET    /api/seeds/analytics/overview # 种子总览（总数/活跃/休眠/淘汰）
GET    /api/seeds/analytics/score-distribution  # 评分分布
GET    /api/seeds/analytics/coverage # 覆盖率报告
GET    /api/seeds/analytics/missed   # 漏采报告
```

---

## 八、关键指标

| 指标 | 说明 | 目标值 |
|------|------|--------|
| 种子覆盖率 | 应覆盖的实体/事件中有多少有种子 | > 90% |
| 种子有效率 | active 种子中有多少能产出证据 | > 60% |
| 平均种子评分 | 所有 active 种子的平均分 | > 50 |
| 漏采率 | 搜索兜底发现的遗漏占比 | < 10% |
| 扩展命中率 | 扩展出的新种子中有多少成为 active | > 40% |
| 种子周转率 | 每月新增种子 / 总种子数 | 10-20% |

---

## 九、设计决策

| 决策 | 结论 | 理由 |
|------|------|------|
| 评分算法 | 规则模型（V1） | 简单可控，数据积累后 V2 可升级 RL |
| 扩展方式 | LLM + 共现 | LLM 理解语义，共现发现隐含关联 |
| 漏采检测 | 三种方法互补 | 交叉验证 + 搜索兜底 + 人工反馈 |
| 状态机 | 4 状态 | 足够区分，不过度复杂 |
| 衰减机制 | 线性衰减 + 惯性更新 | 避免剧烈波动，保持稳定性 |
| 种子预算 | 按采集周期分配 | 控制成本，避免无效请求 |

---

## 十、后续演进

- **V2.0**：种子 Embedding → 语义空间种子发现
- **V2.0**：RL 强化学习种子选择（数据量够之后）
- **V2.0**：种子关联图谱（种子之间的关系网络）
- **V3.0**：跨项目种子共享（GI ↔ AD ↔ Dataki）
