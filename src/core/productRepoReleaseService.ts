import { FileStore } from './fileStore.js';

type BuildReleaseReadinessPackageInput = {
  versionLabel?: string | null;
  subprojectId?: string | null;
  validationCommands?: string[];
  parkedTracks?: string[];
  productFiles?: string[];
  releaseNotes?: string | null;
};

const DEFAULT_VALIDATION_COMMANDS = [
  'npm run validate',
  'npm run build:backend',
  'npm test',
];

const DEFAULT_PRODUCT_FILES = [
  'src/',
  'tests/',
  'docs/operations/current-version-progress.md',
  'docs/operations/v1.0-gap-list.md',
  'docs/operations/product-repo-release-readiness.md',
  'cloud-mirror/runtime-status.json',
  'cloud-mirror/runtime-status.md',
];

export class ProductRepoReleaseService {
  constructor(private readonly store: FileStore) {}

  async buildReadinessPackage(input: BuildReleaseReadinessPackageInput = {}) {
    const generatedAt = new Date().toISOString();
    const versionLabel = input.versionLabel?.trim() || 'v1.0-non-page-slice';
    const payload = {
      version: 1,
      generatedAt,
      versionLabel,
      subprojectId: input.subprojectId ?? null,
      status: 'candidate',
      validationCommands: input.validationCommands?.length ? input.validationCommands : DEFAULT_VALIDATION_COMMANDS,
      parkedTracks: input.parkedTracks?.length ? input.parkedTracks : ['pmos-page-unified-entry', 'cloud-external-publish'],
      productFiles: input.productFiles?.length ? input.productFiles : DEFAULT_PRODUCT_FILES,
      releaseNotes: input.releaseNotes ?? null,
      acceptance: [
        'Product-core files are separated from business subproject changes.',
        'Validation commands are declared and rerunnable.',
        'Document governance and runtime mirror artifacts are part of the package.',
        'Parked tracks are explicit and do not masquerade as completed release scope.',
      ],
    };
    const jsonPath = 'docs/release/product-repo-readiness-package.json';
    const markdownPath = 'docs/release/product-repo-readiness-package.md';
    await this.store.writeJson(jsonPath, payload);
    await this.store.write(
      markdownPath,
      [
        '# Product Repo Readiness Package',
        '',
        `- versionLabel: ${payload.versionLabel}`,
        `- generatedAt: ${payload.generatedAt}`,
        `- status: ${payload.status}`,
        `- subprojectId: ${payload.subprojectId ?? '-'}`,
        '',
        '## Validation Commands',
        ...payload.validationCommands.map((command) => `- \`${command}\``),
        '',
        '## Product Files',
        ...payload.productFiles.map((filePath) => `- \`${filePath}\``),
        '',
        '## Parked Tracks',
        ...payload.parkedTracks.map((track) => `- ${track}`),
        '',
        '## Acceptance',
        ...payload.acceptance.map((item) => `- ${item}`),
        '',
        '## Release Notes',
        payload.releaseNotes ?? '-',
        '',
      ].join('\n'),
    );

    return {
      ...payload,
      jsonPath,
      markdownPath,
    };
  }
}
