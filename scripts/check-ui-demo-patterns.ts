import fs from 'node:fs';
import path from 'node:path';

const forbidden = [
  'hero',
  'Hero',
  'poster',
  'Poster',
  'feature grid',
  'FeatureGrid',
  'landing',
  'Landing',
  'glassmorphism',
  'Get Started',
  'AI-powered platform',
  'beautiful dashboard',
  'showcase',
  'Showcase',
  'gradient marketing',
  'CTA section',
  'Claude style',
];

const targetDirs = ['src/app', 'src/pages', 'src/components', 'src/ui', 'app', 'pages', 'components'];
const schemaOnly = process.argv.includes('--schema-only');

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (/\.(tsx|ts|jsx|js)$/u.test(full)) return [full];
    return [];
  });
}

function walkSchemas(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return walkSchemas(full);
    if (/\.schema\.json$/u.test(full)) return [full];
    return [];
  });
}

const violations: string[] = [];

function validateAction(action: Record<string, unknown>, schemaPath: string, blockId: string) {
  if (!('riskLevel' in action)) violations.push(`${schemaPath}: ${blockId} action missing riskLevel`);
  const highRisk = action.riskLevel === 'high';
  if (highRisk && !('approvalPolicy' in action) && !('requiresApproval' in action)) {
    violations.push(`${schemaPath}: ${blockId} high-risk action missing approvalPolicy/requiresApproval`);
  }
  if (highRisk && action.auditRequired !== true) {
    violations.push(`${schemaPath}: ${blockId} high-risk action must set auditRequired=true`);
  }
}

function validateSchemaFile(schemaPath: string) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as {
    screenType?: string;
    layout?: { desktop?: string; mobile?: string };
    regions?: Record<string, Array<Record<string, unknown>>>;
    blocks?: Array<Record<string, unknown>>;
    evidenceRefs?: string[];
    sourceRefs?: string[];
    lastUpdatedAt?: string;
    freshness?: string;
  };

  if (!schema.screenType) violations.push(`${schemaPath}: missing screenType`);
  if (!schema.layout?.desktop) violations.push(`${schemaPath}: missing layout.desktop`);
  if (!schema.layout?.mobile) violations.push(`${schemaPath}: missing layout.mobile`);
  if (!schema.regions && !schema.blocks) violations.push(`${schemaPath}: missing regions or blocks`);

  const regionBlocks = schema.regions ? Object.values(schema.regions).flat() : [];
  const blocks = [...regionBlocks, ...(schema.blocks ?? [])];

  if (!schema.evidenceRefs && !schema.sourceRefs && !blocks.some((block) => 'evidenceRefs' in block || 'sourceRefs' in block)) {
    violations.push(`${schemaPath}: missing evidenceRefs or sourceRefs`);
  }
  if (!schema.lastUpdatedAt && !schema.freshness && !blocks.some((block) => 'lastUpdatedAt' in block || 'freshness' in block)) {
    violations.push(`${schemaPath}: missing lastUpdatedAt or freshness`);
  }

  for (const block of blocks) {
    const blockId = typeof block.id === 'string' ? block.id : 'unknown-block';
    const blockType = typeof block.type === 'string' ? block.type : 'unknown-type';

    if ((blockType === 'DecisionCard' || blockType === 'AIRecommendationCard') && !('evidenceRefs' in block)) {
      violations.push(`${schemaPath}: ${blockId} missing evidenceRefs`);
    }
    if ((blockType === 'EvidencePanel' || blockType === 'SourceReferenceList') && !('lastUpdatedAt' in block)) {
      violations.push(`${schemaPath}: ${blockId} missing lastUpdatedAt`);
    }
    if (blockType === 'DecisionCard' && !('decisionPolicy' in block)) {
      violations.push(`${schemaPath}: ${blockId} missing decisionPolicy`);
    }
    if (blockType === 'ApprovalPanel' && !('approvalPolicy' in block)) {
      violations.push(`${schemaPath}: ${blockId} missing approvalPolicy`);
    }

    const actions = Array.isArray(block.recommendedActions)
      ? (block.recommendedActions as Array<Record<string, unknown>>)
      : Array.isArray(block.actions)
        ? (block.actions as Array<Record<string, unknown>>)
        : [];

    for (const action of actions) validateAction(action, schemaPath, blockId);
  }
}

if (!schemaOnly) {
  for (const file of targetDirs.flatMap(walk)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const word of forbidden) {
      if (content.includes(word)) {
        violations.push(`${file}: contains forbidden UI demo pattern "${word}"`);
      }
    }
  }
}

const schemaFiles = walkSchemas('golden');
if (!schemaFiles.length) {
  violations.push('missing golden schema files under golden/');
}
for (const schemaPath of schemaFiles) validateSchemaFile(schemaPath);

if (violations.length) {
  console.error('Forbidden demo UI patterns or schema violations found:');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(schemaOnly ? 'UI schema structure checks passed.' : 'UI demo pattern and schema checks passed.');
