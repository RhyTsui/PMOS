/**
 * 情报简报生成服务
 *
 * 负责把采集到的证据事件按画像配置生成为日报/专题简报。
 * 每次生成产生一个快照版本的 IntelligenceBrief，支持历史追溯与反馈迭代。
 *
 * 生成流程（对应 WHITE_PAPER §11.1）：
 *   1. 读取 RequirementProfile
 *   2. 拉取时间窗口内的 EvidenceEvent
 *   3. 按画像的 deliveryPolicy 分组为段落
 *   4. 段落内按 priority + impactScore 排序
 *   5. 绑定 Evidence Ledger（证据账本）
 *   6. 保存 IntelligenceBrief（状态：draft）
 *   7. 可选自动发布（draft → published）
 *
 * @see docs/WHITE_PAPER.md §11.1 / §11.2
 * @see docs/design/02-数据模型设计.md §6.8
 */
import { RequirementProfileRepository } from '../../repositories/requirement-profile-repository.js';
import { EvidenceEventRepository } from '../../repositories/evidence-event-repository.js';
import { EvidenceLedgerRepository } from '../../repositories/evidence-ledger-repository.js';
import { IntelligenceBriefRepository } from '../../repositories/intelligence-brief-repository.js';
import type {
  RequirementProfile,
  EvidenceEvent,
  IntelligenceBrief,
  BriefSection,
  BriefItem,
  BriefType,
  Priority,
  EventType,
} from '../../models/types.js';

// ===== 输入/输出 =====

export interface GenerateBriefInput {
  profileId: string;
  briefType: BriefType;
  title?: string;
  /** 时间窗口（小时），默认 24 */
  windowHours?: number;
  /** 是否自动发布（默认 false，保存为 draft） */
  autoPublish?: boolean;
  /** 指定日期（YYYY-MM-DD），默认今天 */
  date?: string;
}

export interface GenerateBriefResult {
  brief: IntelligenceBrief;
  sectionsGenerated: number;
  itemsGenerated: number;
  evidenceBound: number;
}

// ===== 段落配置：事件类型 → 段落标题 =====

/**
 * 默认段落模板。
 * 与 WHITE_PAPER §8.6 Delivery Template 对应。
 */
const DEFAULT_SECTION_TEMPLATE: Array<{
  eventTypes: EventType[];
  title: string;
  order: number;
}> = [
  { eventTypes: ['版号', '融资', '组织动作', '政策'], title: '今日重点事件', order: 1 },
  { eventTypes: ['上线', '测试', '预约'], title: '新游 / 测试 / 预约', order: 2 },
  { eventTypes: ['买量'], title: '买量素材变化', order: 3 },
  { eventTypes: ['榜单变化'], title: '榜单与热度变化', order: 4 },
  { eventTypes: ['合作', '出海', '版本更新', 'AI应用'], title: '产品动态', order: 5 },
  { eventTypes: ['舆情'], title: '舆论与风险', order: 6 },
];

// ===== 服务实现 =====

export class BriefGenerationService {
  private profileRepo = new RequirementProfileRepository();
  private eventRepo = new EvidenceEventRepository();
  private ledgerRepo = new EvidenceLedgerRepository();
  private briefRepo = new IntelligenceBriefRepository();

  /**
   * 生成日报/专题简报
   */
  generate(input: GenerateBriefInput): GenerateBriefResult {
    const profile = this.profileRepo.findById(input.profileId);
    if (!profile) {
      throw new Error(`画像不存在: ${input.profileId}`);
    }

    const windowHours = input.windowHours ?? 24;
    const briefType = input.briefType;
    const title = input.title ?? this.buildTitle(profile, briefType, input.date);

    // 1. 拉取时间窗口内的事件
    const events = this.fetchWindowEvents(windowHours, profile);

    // 2. 按画像关注点过滤
    const filtered = this.filterByProfile(events, profile);

    // 3. 分段
    const sections = this.buildSections(filtered, profile);

    // 4. 收集所有 evidence IDs（用于绑定账本）
    const allEvidenceIds = this.collectEvidenceIds(sections);

    // 5. 创建简报（draft）
    const brief = this.briefRepo.create({
      profileId: profile.id,
      briefType,
      title,
      sections,
      evidenceIds: allEvidenceIds,
      status: 'draft',
    } as IntelligenceBrief);

    // 6. 为每个 item 绑定 Evidence Ledger
    let boundCount = 0;
    for (const section of sections) {
      for (const item of section.items) {
        this.bindLedger(brief.id, item);
        boundCount += item.evidenceIds.length;
      }
    }

    // 7. 自动发布
    if (input.autoPublish) {
      this.briefRepo.publish(brief.id);
      brief.status = 'published';
      brief.publishedAt = new Date().toISOString();
    }

    const itemsGenerated = sections.reduce((sum, s) => sum + s.items.length, 0);

    return {
      brief,
      sectionsGenerated: sections.length,
      itemsGenerated,
      evidenceBound: boundCount,
    };
  }

  /**
   * 生成日报的便捷方法
   */
  generateDaily(profileId: string, options?: { autoPublish?: boolean; date?: string }): GenerateBriefResult {
    return this.generate({
      profileId,
      briefType: 'daily',
      windowHours: 24,
      autoPublish: options?.autoPublish ?? false,
      date: options?.date,
    });
  }

  /**
   * 生成专题简报
   */
  generateTopic(
    profileId: string,
    title: string,
    options?: { windowHours?: number; autoPublish?: boolean },
  ): GenerateBriefResult {
    return this.generate({
      profileId,
      briefType: 'topic',
      title,
      windowHours: options?.windowHours ?? 168, // 默认 7 天
      autoPublish: options?.autoPublish ?? false,
    });
  }

  // ===== 私有方法 =====

  /**
   * 拉取时间窗口内的事件
   */
  private fetchWindowEvents(windowHours: number, _profile: RequirementProfile): EvidenceEvent[] {
    // 当前实现：拉取最近的 N 个事件
    // TODO: 严格按时间窗口过滤（需要在 repo 添加 findByTimeRange 方法）
    const limit = Math.min(windowHours * 5, 200); // 粗略估算
    return this.eventRepo.findRecent(limit);
  }

  /**
   * 按画像关注点过滤事件
   */
  private filterByProfile(events: EvidenceEvent[], profile: RequirementProfile): EvidenceEvent[] {
    if (profile.focusTopics.length === 0 && profile.entities.companies.length === 0) {
      return events; // 无过滤条件，返回全部
    }

    return events.filter((event) => {
      // 话题匹配
      const topicMatch = profile.focusTopics.some((topic) =>
        event.eventTitle.includes(topic) ||
        event.keyFacts.some((f) => f.fact.includes(topic)),
      );

      // 实体匹配
      const entityMatch = [
        ...profile.entities.companies,
        ...profile.entities.products,
        ...profile.entities.platforms,
      ].some((entity) =>
        event.entities.some((e) => e.name === entity) ||
        event.eventTitle.includes(entity),
      );

      // 排除项
      const excludeMatch = profile.deliveryPolicy.excludeContent.some((kw) =>
        event.eventTitle.includes(kw),
      );

      return (topicMatch || entityMatch) && !excludeMatch;
    });
  }

  /**
   * 把事件分段
   */
  private buildSections(
    events: EvidenceEvent[],
    profile: RequirementProfile,
  ): BriefSection[] {
    const sections: BriefSection[] = [];

    for (const template of DEFAULT_SECTION_TEMPLATE) {
      const matchedEvents = events.filter((e) =>
        template.eventTypes.includes(e.eventType as EventType),
      );

      if (matchedEvents.length === 0) continue;

      // 按优先级 + 影响分排序
      const sorted = this.sortEvents(matchedEvents, profile);

      const items: BriefItem[] = sorted.slice(0, 10).map((e, idx) => ({
        id: `${template.order}-${idx + 1}`,
        title: e.eventTitle,
        summary: this.buildSummary(e),
        eventType: e.eventType,
        priority: e.priority,
        evidenceIds: e.evidenceIds,
        sourceCount: e.sourceCount,
        audienceTags: e.audienceTags,
      }));

      sections.push({
        id: `section-${template.order}`,
        title: template.title,
        order: template.order,
        items,
      });
    }

    // 添加"需继续核验线索"段落
    const unverifiedItems = this.buildUnverifiedSection(events);
    if (unverifiedItems.items.length > 0) {
      sections.push(unverifiedItems);
    }

    return sections;
  }

  /**
   * 按画像优先级排序
   */
  private sortEvents(events: EvidenceEvent[], profile: RequirementProfile): EvidenceEvent[] {
    const priorityWeight = (p: Priority): number => {
      switch (p) {
        case 'P0': return 4;
        case 'P1': return 3;
        case 'P2': return 2;
        case 'P3': return 1;
      }
    };

    return [...events].sort((a, b) => {
      const aPriority = priorityWeight(a.priority);
      const bPriority = priorityWeight(b.priority);
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.impactScore - a.impactScore;
    });
  }

  /**
   * 构建"需继续核验线索"段落
   */
  private buildUnverifiedSection(events: EvidenceEvent[]): BriefSection {
    const unverified = events
      .filter((e) => e.confidenceScore < 0.7 || e.sourceCount === 1)
      .slice(0, 5);

    return {
      id: 'section-unverified',
      title: '需继续核验线索',
      order: 99,
      items: unverified.map((e, idx) => ({
        id: `unverified-${idx + 1}`,
        title: e.eventTitle,
        summary: this.buildSummary(e),
        eventType: e.eventType,
        priority: e.priority,
        evidenceIds: e.evidenceIds,
        sourceCount: e.sourceCount,
        audienceTags: e.audienceTags,
      })),
    };
  }

  /**
   * 为简报中的每个 item 绑定 Evidence Ledger
   */
  private bindLedger(briefId: string, item: BriefItem): void {
    for (const evidenceId of item.evidenceIds) {
      // 避免重复插入
      const existing = this.ledgerRepo.findByTarget('intelligence_brief', briefId);
      if (existing.some((l) => l.rawEvidenceId === evidenceId || l.title === item.title)) {
        continue;
      }

      this.ledgerRepo.create({
        targetType: 'intelligence_brief',
        targetId: briefId,
        evidenceType: 'cross_verified',
        rawEvidenceId: evidenceId,
        title: item.title,
        confidence: 0.5, // 简报绑定默认中等置信度
        verificationStatus: 'unverified',
        collectedAt: new Date().toISOString(),
      } as any);
    }
  }

  /**
   * 收集所有段落中的 evidenceIds
   */
  private collectEvidenceIds(sections: BriefSection[]): string[] {
    const ids = new Set<string>();
    for (const section of sections) {
      for (const item of section.items) {
        for (const id of item.evidenceIds) {
          ids.add(id);
        }
      }
    }
    return Array.from(ids);
  }

  /**
   * 构造事件摘要
   */
  private buildSummary(event: EvidenceEvent): string {
    if (event.keyFacts.length === 0) return event.eventTitle;
    const topFacts = event.keyFacts
      .filter((f) => f.importance === 'high')
      .slice(0, 2)
      .map((f) => f.fact);
    return topFacts.length > 0 ? topFacts.join('；') : event.keyFacts[0].fact;
  }

  /**
   * 构造简报标题
   */
  private buildTitle(
    profile: RequirementProfile,
    briefType: BriefType,
    date?: string,
  ): string {
    const d = date ?? new Date().toISOString().split('T')[0];
    switch (briefType) {
      case 'daily':
        return `${profile.industry}行业日报 — ${d}`;
      case 'topic':
        return `${profile.name} 专题简报 — ${d}`;
      case 'alert':
        return `${profile.name} 紧急预警 — ${d}`;
      default:
        return `${profile.name} — ${d}`;
    }
  }
}
