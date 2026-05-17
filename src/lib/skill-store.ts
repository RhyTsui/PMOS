import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpSkill } from '@/types';
import { DEMO_MCP_SKILLS } from './demo-data';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';

const SKILLS_PATH = runtimeDataPath('skills.json');
const LEGACY_SKILLS_PATH = legacyDataPath('skills.json');

interface SkillsFile {
  skills: McpSkill[];
}

function normalizeSkill(input: Partial<McpSkill>): McpSkill {
  return {
    id: input.id || `skill-${Date.now()}`,
    name: input.name || '',
    description: input.description || '',
    icon: input.icon || '🔧',
    source: input.source || 'custom',
    category: input.category || 'other',
    endpoint_url: input.endpoint_url || '',
    transport: input.transport || 'streamable-http',
    auth_type: input.auth_type || 'none',
    auth_config_template: input.auth_config_template || {},
    expected_tools: Array.isArray(input.expected_tools) ? input.expected_tools : [],
    installed: Boolean(input.installed),
    installed_server_id: input.installed_server_id,
    tags: Array.isArray(input.tags) ? input.tags : [],
    use_cases: Array.isArray(input.use_cases) ? input.use_cases : [],
    sort_order: input.sort_order || 999,
    created_at: input.created_at || Date.now(),
    updated_at: input.updated_at || Date.now(),
  };
}

async function readSkillsFile(): Promise<SkillsFile> {
  for (const filePath of [SKILLS_PATH, LEGACY_SKILLS_PATH]) {
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<SkillsFile>;
      if (Array.isArray(parsed.skills)) {
        return { skills: parsed.skills.map(normalizeSkill) };
      }
    } catch {
      // Try next location.
    }
  }
  return { skills: DEMO_MCP_SKILLS.map(normalizeSkill) };
}

async function writeSkillsFile(file: SkillsFile): Promise<void> {
  await mkdir(path.dirname(SKILLS_PATH), { recursive: true });
  await writeFile(SKILLS_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function listSkills(): Promise<McpSkill[]> {
  const file = await readSkillsFile();
  return file.skills.sort((a, b) => a.sort_order - b.sort_order);
}

export async function createSkill(data: Partial<McpSkill>): Promise<McpSkill> {
  const file = await readSkillsFile();
  const skill = normalizeSkill({
    ...data,
    id: data.id || `skill-${Date.now()}`,
    created_at: Date.now(),
    updated_at: Date.now(),
  });
  file.skills = [...file.skills, skill];
  await writeSkillsFile(file);
  return skill;
}

export async function updateSkill(id: string, patch: Partial<McpSkill>): Promise<McpSkill | undefined> {
  const file = await readSkillsFile();
  let updated: McpSkill | undefined;
  file.skills = file.skills.map((skill) => {
    if (skill.id !== id) return skill;
    updated = normalizeSkill({ ...skill, ...patch, id, updated_at: Date.now() });
    return updated;
  });
  if (!updated) return undefined;
  await writeSkillsFile(file);
  return updated;
}

export async function setSkillInstalled(id: string, installed: boolean): Promise<McpSkill | undefined> {
  return updateSkill(id, {
    installed,
    installed_server_id: installed ? `mcp-installed-${id}` : undefined,
  });
}
