const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const rootAgentsPath = path.join(repoRoot, 'AGENTS.md');
const guardrailsSpecPath = path.join(repoRoot, 'docs', 'architecture', 'governance', 'ai-chat-implementation-guardrails.md');
const packageJsonPath = path.join(repoRoot, 'imported', 'projects', 'package.json');
const enterpriseSpecPath = path.join(repoRoot, 'docs', 'architecture', 'ENTERPRISE_AI_CHAT_OS_SPEC.md');
const uiGuardrailPath = path.join(repoRoot, 'docs', 'operations', 'ui-guardrail.md');

const requiredAgentsRefs = [
  'docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md',
  'docs/architecture/governance/ai-chat-implementation-guardrails.md',
  'docs/operations/ui-guardrail.md',
];
const requiredScriptName = 'check:ai-chat-guardrails';

const violations = [];

function readText(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function requireLine(filePath, pattern, label) {
  const content = readText(filePath);
  if (!content) {
    violations.push(`${label} file missing: ${path.relative(repoRoot, filePath)}`);
    return;
  }
  if (!pattern.test(content)) {
    violations.push(`${label} missing required content: ${pattern}`);
  }
}

const rootAgentsContent = readText(rootAgentsPath) || '';
for (const ref of requiredAgentsRefs) {
  if (!rootAgentsContent.includes(ref)) {
    violations.push(`Root AGENTS missing required reference: ${ref}`);
  }
}

requireLine(guardrailsSpecPath, /AI Chat/i, 'AI chat guardrails spec');
requireLine(guardrailsSpecPath, /think first|先思考|先分析/i, 'AI chat guardrails spec');

requireLine(enterpriseSpecPath, /AI Chat/i, 'Enterprise AI Chat OS spec');
if (!fs.existsSync(uiGuardrailPath)) {
  violations.push(`Required file missing: ${path.relative(repoRoot, uiGuardrailPath)}`);
}

if (!fs.existsSync(packageJsonPath)) {
  violations.push(`package.json missing: ${path.relative(repoRoot, packageJsonPath)}`);
} else {
  const scripts = (() => {
    try {
      return JSON.parse(readText(packageJsonPath)).scripts || {};
    } catch (error) {
      violations.push(`package.json parse failed: ${error.message}`);
      return null;
    }
  })();

  if (scripts) {
    const script = scripts[requiredScriptName];
    if (!script) {
      violations.push(`package.json missing script "${requiredScriptName}"`);
    } else if (!script.includes('check-ai-chat-guardrails.cjs')) {
      violations.push(`package.json "${requiredScriptName}" should call check-ai-chat-guardrails.cjs`);
    }
  }
}

if (violations.length > 0) {
  console.error('AI chat guardrail violations:');
  console.error(violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('AI chat guardrails checks passed.');
