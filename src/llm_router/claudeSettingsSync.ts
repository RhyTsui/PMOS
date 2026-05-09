import * as fs from 'fs';
import * as path from 'path';
import type { ResolvedProvider } from '../core/providerRegistry.js';

const CLAUDE_SETTINGS_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? '',
  '.claude',
  'settings.json'
);

// Map provider name to the model string written to Claude settings.json
function getModelForProvider(provider: ResolvedProvider): string {
  switch (provider.name) {
    case 'claude':
      return 'claude-sonnet-4-6';
    case 'gemini':
      return 'gemini-2.5-flash';
    case 'minimax':
      return 'MiniMaxM2.5';
    case 'qwen':
      return 'qwen-plus';
    default:
      return provider.model ?? provider.name;
  }
}

export async function syncActiveModelToSettings(provider: ResolvedProvider): Promise<void> {
  const model = getModelForProvider(provider);

  try {
    const raw = await fs.promises.readFile(CLAUDE_SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(raw);

    settings.env ??= {};
    settings.env.ANTHROPIC_MODEL = model;
    settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
    settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = model;
    settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = model;
    settings.env.ANTHROPIC_REASONING_MODEL = model;

    await fs.promises.writeFile(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  } catch {
    // Silently ignore — Claude settings.json is not critical to llm_router operation
  }
}
