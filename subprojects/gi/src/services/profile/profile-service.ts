/**
 * 情报需求画像服务
 *
 * 封装 RequirementProfile 的业务逻辑：
 * - 生命周期管理（创建 / 启用 / 暂停 / 归档）
 * - 配置校验
 * - 与种子系统的联动（画像变更时触发种子生成）
 *
 * @see docs/WHITE_PAPER.md §8（配置中心设计）
 * @see docs/design/02-数据模型设计.md §6.1
 */
import { RequirementProfileRepository } from '../../repositories/requirement-profile-repository.js';
import type {
  RequirementProfile,
  ProfileStatus,
  BriefFormat,
} from '../../models/types.js';

// ===== 输入 DTO =====

export interface CreateProfileInput {
  name: string;
  owner: string;
  industry?: string;
  purpose?: string[];
  focusTopics?: string[];
  entities?: {
    companies?: string[];
    products?: string[];
    platforms?: string[];
    persons?: string[];
  };
  sourcePolicy?: {
    preferredSourceIds?: string[];
    excludeSourceIds?: string[];
    minReliability?: string;
  };
  verificationPolicy?: {
    required?: boolean;
    minSources?: number;
  };
  deliveryPolicy: {
    format: BriefFormat;
    frequency: string;
    channels?: string[];
    excludeContent?: string[];
  };
  priority?: Record<string, 'high' | 'medium' | 'low'>;
  timeWindow?: string;
}

export interface UpdateProfileInput extends Partial<CreateProfileInput> {
  status?: ProfileStatus;
}

// ===== 输出 DTO =====

export interface ProfileSummary {
  id: string;
  name: string;
  owner: string;
  industry: string;
  status: ProfileStatus;
  focusTopics: string[];
  entityCount: number;
  lastUpdatedAt: string;
}

// ===== 服务 =====

export class RequirementProfileService {
  private repo = new RequirementProfileRepository();

  /**
   * 创建画像
   */
  createProfile(input: CreateProfileInput): RequirementProfile {
    this.validateInput(input);

    const profile = this.repo.create({
      name: input.name,
      owner: input.owner,
      industry: input.industry ?? '游戏',
      purpose: input.purpose ?? [],
      focusTopics: input.focusTopics ?? [],
      entities: {
        companies: input.entities?.companies ?? [],
        products: input.entities?.products ?? [],
        platforms: input.entities?.platforms ?? [],
        persons: input.entities?.persons ?? [],
      },
      sourcePolicy: {
        preferredSourceIds: input.sourcePolicy?.preferredSourceIds ?? [],
        excludeSourceIds: input.sourcePolicy?.excludeSourceIds ?? [],
        minReliability: input.sourcePolicy?.minReliability,
      },
      verificationPolicy: {
        required: input.verificationPolicy?.required ?? true,
        minSources: input.verificationPolicy?.minSources ?? 2,
      },
      deliveryPolicy: {
        format: input.deliveryPolicy.format,
        frequency: input.deliveryPolicy.frequency,
        channels: input.deliveryPolicy.channels ?? [],
        excludeContent: input.deliveryPolicy.excludeContent ?? [],
      },
      priority: input.priority ?? {},
      timeWindow: input.timeWindow ?? '最近7天',
      status: 'active',
    } as unknown as RequirementProfile);

    return profile;
  }

  /**
   * 获取画像详情
   */
  getProfile(id: string): RequirementProfile | null {
    return this.repo.findById(id);
  }

  /**
   * 更新画像
   */
  updateProfile(id: string, input: UpdateProfileInput): RequirementProfile | null {
    const existing = this.repo.findById(id);
    if (!existing) return null;

    const updates: Partial<RequirementProfile> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.industry !== undefined) updates.industry = input.industry;
    if (input.purpose !== undefined) updates.purpose = input.purpose;
    if (input.focusTopics !== undefined) updates.focusTopics = input.focusTopics;
    if (input.entities !== undefined) {
      updates.entities = {
        companies: input.entities.companies ?? existing.entities.companies,
        products: input.entities.products ?? existing.entities.products,
        platforms: input.entities.platforms ?? existing.entities.platforms,
        persons: input.entities.persons ?? existing.entities.persons ?? [],
      };
    }
    if (input.sourcePolicy !== undefined) {
      updates.sourcePolicy = {
        preferredSourceIds: input.sourcePolicy.preferredSourceIds ?? existing.sourcePolicy.preferredSourceIds,
        excludeSourceIds: input.sourcePolicy.excludeSourceIds ?? existing.sourcePolicy.excludeSourceIds,
        minReliability: input.sourcePolicy.minReliability ?? existing.sourcePolicy.minReliability,
      };
    }
    if (input.verificationPolicy !== undefined) {
      updates.verificationPolicy = {
        required: input.verificationPolicy.required ?? existing.verificationPolicy.required,
        minSources: input.verificationPolicy.minSources ?? existing.verificationPolicy.minSources,
      };
    }
    if (input.deliveryPolicy !== undefined) {
      updates.deliveryPolicy = {
        format: input.deliveryPolicy.format ?? existing.deliveryPolicy.format,
        frequency: input.deliveryPolicy.frequency ?? existing.deliveryPolicy.frequency,
        channels: input.deliveryPolicy.channels ?? existing.deliveryPolicy.channels,
        excludeContent: input.deliveryPolicy.excludeContent ?? existing.deliveryPolicy.excludeContent,
      };
    }
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.timeWindow !== undefined) updates.timeWindow = input.timeWindow;
    if (input.status !== undefined) updates.status = input.status;

    return this.repo.update(id, updates);
  }

  /**
   * 删除画像
   */
  deleteProfile(id: string): boolean {
    return this.repo.delete(id);
  }

  /**
   * 列出画像（按所有者）
   */
  listByOwner(owner: string, status?: ProfileStatus): ProfileSummary[] {
    return this.repo.findByOwner(owner, status).map((p) => this.toSummary(p));
  }

  /**
   * 列出所有活跃画像
   */
  listActive(): ProfileSummary[] {
    return this.repo.findByStatus('active').map((p) => this.toSummary(p));
  }

  /**
   * 切换画像状态
   */
  setStatus(id: string, status: ProfileStatus): boolean {
    return this.repo.updateStatus(id, status);
  }

  /**
   * 获取画像统计
   */
  getStats(): Record<ProfileStatus, number> {
    return this.repo.countByStatus();
  }

  /**
   * 提取画像涉及的所有实体名（用于种子生成）
   */
  extractEntities(profileId: string): string[] {
    const profile = this.repo.findById(profileId);
    if (!profile) return [];

    const entities = new Set<string>();
    for (const c of profile.entities.companies) entities.add(c);
    for (const p of profile.entities.products) entities.add(p);
    for (const p of profile.entities.platforms) entities.add(p);
    for (const p of profile.entities.persons ?? []) entities.add(p);
    for (const t of profile.focusTopics) entities.add(t);

    return Array.from(entities);
  }

  // ===== 私有方法 =====

  private toSummary(profile: RequirementProfile): ProfileSummary {
    const entityCount =
      profile.entities.companies.length +
      profile.entities.products.length +
      profile.entities.platforms.length +
      (profile.entities.persons?.length ?? 0);

    return {
      id: profile.id,
      name: profile.name,
      owner: profile.owner,
      industry: profile.industry,
      status: profile.status,
      focusTopics: profile.focusTopics,
      entityCount,
      lastUpdatedAt: profile.updatedAt,
    };
  }

  /**
   * 输入校验
   */
  private validateInput(input: CreateProfileInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('画像名称不能为空');
    }
    if (!input.owner || input.owner.trim().length === 0) {
      throw new Error('画像所有者不能为空');
    }
    if (!input.deliveryPolicy?.format) {
      throw new Error('分发策略 format 必填');
    }
    if (!input.deliveryPolicy?.frequency) {
      throw new Error('分发策略 frequency 必填');
    }
  }
}
