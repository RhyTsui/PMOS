import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import type { FileStore } from './fileStore.js';
import { SkillRegistry, type SkillDefinition } from './skillRegistry.js';
import { SubprojectRegistry } from './subprojectRegistry.js';

const execFile = promisify(execFileCallback);

type ChecklistItem = {
  section: string;
  label: string;
  checked: boolean;
};

type ChecklistSummary = {
  path: string;
  total: number;
  checked: number;
  unchecked: number;
  items: ChecklistItem[];
  currentConclusion: string | null;
  blockedReasons: string[];
  nextSteps: string[];
};

export class SubprojectPrepService {
  constructor(
    private readonly store: FileStore,
    private readonly skillRegistry = new SkillRegistry(store),
    private readonly subprojectRegistry = new SubprojectRegistry(store),
  ) {}

  async scan(subprojectId?: string | null) {
    const project = await this.subprojectRegistry.resolveProjectContext(subprojectId);
    const skills = await this.skillRegistry.listSkills(subprojectId);
    const commandSkills = this.collectCommandSkills(skills);

    if (commandSkills.length === 0) {
      throw new Error(`subproject ${subprojectId ?? 'platform'} has no prep scan command configured.`);
    }

    const command = commandSkills[0].deployment.command;
    if (!command) {
      throw new Error(`prep scan command is missing for ${commandSkills[0].id}.`);
    }

    const { executable, args } = this.parseCommand(command);
    const { stdout, stderr } = await execFile(executable, args, {
      cwd: this.store.resolve(project.projectRoot),
    });

    const relatedSkills = commandSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      command: skill.deployment.command,
      statusPath: skill.deployment.statusPath,
    }));

    return {
      subprojectId: subprojectId ?? null,
      projectRoot: project.projectRoot,
      command,
      relatedSkills,
      stdout: stdout.trim() || null,
      stderr: stderr.trim() || null,
    };
  }

  async check(subprojectId?: string | null) {
    const summary = await this.loadChecklistSummary(subprojectId);
    return {
      subprojectId: subprojectId ?? null,
      checklistPath: summary.path,
      total: summary.total,
      checked: summary.checked,
      unchecked: summary.unchecked,
      completionRate: summary.total > 0 ? Number((summary.checked / summary.total).toFixed(3)) : 0,
      currentConclusion: summary.currentConclusion,
      blockedReasons: summary.blockedReasons,
      nextSteps: summary.nextSteps,
      uncheckedItems: summary.items.filter((item) => !item.checked),
    };
  }

  async status(subprojectId?: string | null) {
    const summary = await this.loadChecklistSummary(subprojectId);
    const criticalSections = new Set(['环境条件', '架构边界', '测试与发布门禁']);
    const criticalUnchecked = summary.items.filter((item) => !item.checked && criticalSections.has(item.section));
    const blocked = Boolean(summary.currentConclusion?.includes('不允许')) || criticalUnchecked.length > 0;

    return {
      subprojectId: subprojectId ?? null,
      checklistPath: summary.path,
      currentConclusion: summary.currentConclusion,
      readyForBusinessChange: !blocked,
      status: blocked ? 'blocked' : summary.unchecked > 0 ? 'partial' : 'ready',
      denominator: {
        total: summary.total,
        checked: summary.checked,
        unchecked: summary.unchecked,
      },
      criticalUnchecked,
      blockedReasons: summary.blockedReasons,
      nextSteps: summary.nextSteps,
    };
  }

  private async loadChecklistSummary(subprojectId?: string | null): Promise<ChecklistSummary> {
    const skills = await this.skillRegistry.listSkills(subprojectId);
    const checklistPath = this.resolveChecklistPath(skills);
    if (!checklistPath) {
      throw new Error(`subproject ${subprojectId ?? 'platform'} has no prep checklist path configured.`);
    }

    const markdown = await this.store.read(checklistPath);
    const items = this.parseChecklistItems(markdown);
    const currentConclusion = this.extractSectionValue(markdown, '## 8. 开工判定');
    const blockedReasons = this.extractListAfterLabel(markdown, '原因：');
    const nextSteps = this.extractListAfterLabel(markdown, '允许进入的下一步：');

    return {
      path: checklistPath,
      total: items.length,
      checked: items.filter((item) => item.checked).length,
      unchecked: items.filter((item) => !item.checked).length,
      items,
      currentConclusion,
      blockedReasons,
      nextSteps,
    };
  }

  private resolveChecklistPath(skills: SkillDefinition[]) {
    const preferred = ['repo-bootstrap-skill', 'test-regression-skill'];
    for (const id of preferred) {
      const skill = skills.find((item) => item.id === id);
      const candidate = skill?.deployment.statusPath ?? skill?.promptPath ?? null;
      if (candidate?.trim()) {
        return candidate;
      }
    }

    const fallback = skills.find((skill) => {
      const candidates = [skill.deployment.statusPath, skill.promptPath].filter(Boolean).join(' ');
      return candidates.includes('开工条件检查清单');
    });
    return fallback?.deployment.statusPath ?? fallback?.promptPath ?? null;
  }

  private collectCommandSkills(skills: SkillDefinition[]) {
    const commandMap = new Map<string, SkillDefinition>();
    for (const skill of skills) {
      const command = skill.deployment.command?.trim();
      if (!skill.enabled || !command) {
        continue;
      }
      if (skill.id === 'code-graph-skill' || skill.id === 'repo-bootstrap-skill' || skill.id === 'test-regression-skill') {
        if (!commandMap.has(command)) {
          commandMap.set(command, skill);
        }
      }
    }
    return [...commandMap.values()];
  }

  private parseCommand(command: string) {
    const parts = command.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) {
      throw new Error('prep command is empty.');
    }
    const [executable, ...args] = parts;
    return { executable, args };
  }

  private parseChecklistItems(markdown: string): ChecklistItem[] {
    const lines = markdown.split(/\r?\n/u);
    const items: ChecklistItem[] = [];
    let currentSection = '未分组';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const headingMatch = line.match(/^##\s+\d+\.\s+(.+)$/u);
      if (headingMatch) {
        currentSection = headingMatch[1].trim();
        continue;
      }

      const itemMatch = line.match(/^- \[(x| )\]\s+(.+)$/u);
      if (itemMatch) {
        items.push({
          section: currentSection,
          checked: itemMatch[1] === 'x',
          label: itemMatch[2].trim(),
        });
      }
    }

    return items;
  }

  private extractSectionValue(markdown: string, heading: string) {
    const normalized = markdown.replace(/\r\n/g, '\n');
    const index = normalized.indexOf(heading);
    if (index < 0) {
      return null;
    }

    const section = normalized.slice(index + heading.length).trimStart();
    const firstLine = section.split('\n').find((line) => line.trim().length > 0);
    return firstLine?.trim() ?? null;
  }

  private extractListAfterLabel(markdown: string, label: string) {
    const normalized = markdown.replace(/\r\n/g, '\n');
    const index = normalized.indexOf(label);
    if (index < 0) {
      return [];
    }

    const section = normalized.slice(index + label.length).trimStart();
    const lines = section.split('\n');
    const items: string[] = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (items.length > 0) {
          break;
        }
        continue;
      }
      if (/^##\s/u.test(line)) {
        break;
      }
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/u);
      if (numberedMatch) {
        items.push(numberedMatch[1].trim());
        continue;
      }
      if (items.length > 0) {
        break;
      }
    }
    return items;
  }
}
