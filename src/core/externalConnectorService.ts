import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { FileStore } from './fileStore.js';
import { NotionService } from './notionService.js';
import { getInputInboxPath } from './projectPaths.js';

type FetchResponseLike = {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};

type FetchLike = (input: string, init?: Record<string, unknown>) => Promise<FetchResponseLike>;

export type ExternalConnectorStatus = {
  notion: {
    configured: boolean;
    connected: boolean | null;
    missing: string[];
    targetMode: 'database' | 'page' | 'unconfigured';
  };
  figma: {
    configured: boolean;
    connected: boolean | null;
    missing: string[];
    teamId: string | null;
    defaultFileKey: string | null;
  };
  webFetch: {
    configured: boolean;
    outputRoot: string;
  };
  dingtalk: {
    configured: boolean;
    importMode: 'manual-export-or-paste';
    inboxPath: string;
    localCandidateRoots: string[];
  };
  dataki: {
    configured: boolean;
    connected: boolean | null;
    missing: string[];
    baseUrl: string | null;
  };
};

export type WebFetchArtifact = {
  id: string;
  url: string;
  title: string;
  sourcePath: string;
  fetchedAt: string;
  charCount: number;
};

export type FigmaInspection = {
  fileKey: string;
  name: string;
  role: string | null;
  lastModified: string | null;
  thumbnailUrl: string | null;
  nodeCount: number;
};

export type FigmaTeamProject = {
  id: string;
  name: string;
};

export type DingTalkMeetingImport = {
  id: string;
  sourcePath: string;
  title: string;
  importedAt: string;
  charCount: number;
};

export class ExternalConnectorService {
  constructor(
    private readonly store: FileStore,
    private readonly notionService = new NotionService(store),
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
  ) {}

  async getStatus(subprojectId?: string | null, options?: { checkRemote?: boolean }): Promise<ExternalConnectorStatus> {
    const notionTargetMode = process.env.NOTION_DATABASE_ID
      ? 'database'
      : process.env.NOTION_PAGE_ID
        ? 'page'
        : 'unconfigured';
    const notionConfigured = Boolean(process.env.NOTION_API_KEY && notionTargetMode !== 'unconfigured');
    const figmaConfigured = Boolean(process.env.FIGMA_API_KEY);
    const notionConnected = options?.checkRemote && notionConfigured ? await this.safeNotionConnection() : null;
    const figmaTeamId = process.env.FIGMA_TEAM_ID?.trim() || null;
    const figmaDefaultFileKey = process.env.FIGMA_FILE_KEY?.trim() || null;
    const figmaConnected = options?.checkRemote && figmaConfigured
      ? await this.safeFigmaConnection({ teamId: figmaTeamId, fileKey: figmaDefaultFileKey })
      : null;

    return {
      notion: {
        configured: notionConfigured,
        connected: notionConnected,
        missing: [
          ...(!process.env.NOTION_API_KEY ? ['NOTION_API_KEY'] : []),
          ...(!process.env.NOTION_DATABASE_ID && !process.env.NOTION_PAGE_ID ? ['NOTION_DATABASE_ID or NOTION_PAGE_ID'] : []),
        ],
        targetMode: notionTargetMode,
      },
      figma: {
        configured: figmaConfigured,
        connected: figmaConnected,
        missing: [
          ...(!process.env.FIGMA_API_KEY ? ['FIGMA_API_KEY'] : []),
          ...(!figmaTeamId && !figmaDefaultFileKey ? ['FIGMA_TEAM_ID or FIGMA_FILE_KEY'] : []),
        ],
        teamId: figmaTeamId,
        defaultFileKey: figmaDefaultFileKey,
      },
      webFetch: {
        configured: true,
        outputRoot: getInputInboxPath(subprojectId),
      },
      dingtalk: {
        configured: true,
        importMode: 'manual-export-or-paste',
        inboxPath: getInputInboxPath(subprojectId),
        localCandidateRoots: this.getDingTalkCandidateRoots(),
      },
      dataki: {
        configured: false,
        connected: null,
        missing: ['DATAKI_BASE_URL', 'DATAKI_API_KEY'],
        baseUrl: process.env.DATAKI_BASE_URL?.trim() || process.env.WEKNORA_BASE_URL?.trim() || null,
      },
    };
  }

  async fetchWebPage(input: { url: string; subprojectId?: string | null }): Promise<WebFetchArtifact> {
    const url = this.normalizeUrl(input.url);
    const response = await this.fetchImpl(url, {
      headers: {
        'User-Agent': process.env.WEB_FETCH_USER_AGENT || 'PMAIOS/0.4 external-connector',
        Accept: 'text/html,text/plain,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      throw new Error(`web fetch failed: ${response.status} ${response.statusText}`);
    }

    const raw = await response.text();
    const title = this.extractTitle(raw) || new URL(url).hostname;
    const content = this.htmlToText(raw);
    const id = `web-fetch-${randomUUID()}`;
    const sourcePath = `${getInputInboxPath(input.subprojectId)}/${id}.md`;
    const fetchedAt = new Date().toISOString();

    await this.store.write(
      sourcePath,
      [
        `# ${title}`,
        '',
        `- source: web-fetch`,
        `- url: ${url}`,
        `- fetchedAt: ${fetchedAt}`,
        '',
        '## Content',
        '',
        content,
        '',
      ].join('\n'),
    );

    return {
      id,
      url,
      title,
      sourcePath,
      fetchedAt,
      charCount: content.length,
    };
  }

  async inspectFigmaFile(input: { fileKey?: string | null }): Promise<FigmaInspection> {
    const fileKey = input.fileKey?.trim() || process.env.FIGMA_FILE_KEY?.trim() || '';
    if (!fileKey) {
      throw new Error('fileKey is required');
    }
    if (!process.env.FIGMA_API_KEY) {
      throw new Error('FIGMA_API_KEY is required');
    }

    const response = await this.fetchImpl(`https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}?depth=1`, {
      headers: {
        'X-Figma-Token': process.env.FIGMA_API_KEY,
      },
    });
    if (!response.ok) {
      throw new Error(`figma inspect failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const data = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const document = data.document && typeof data.document === 'object' ? data.document as Record<string, unknown> : {};
    const children = Array.isArray(document.children) ? document.children : [];
    return {
      fileKey,
      name: typeof data.name === 'string' ? data.name : 'Untitled Figma File',
      role: typeof data.role === 'string' ? data.role : null,
      lastModified: typeof data.lastModified === 'string' ? data.lastModified : null,
      thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : null,
      nodeCount: children.length,
    };
  }

  async listFigmaTeamProjects(input?: { teamId?: string | null }): Promise<FigmaTeamProject[]> {
    const teamId = input?.teamId?.trim() || process.env.FIGMA_TEAM_ID?.trim() || '';
    if (!teamId) {
      throw new Error('FIGMA_TEAM_ID is required');
    }
    if (!process.env.FIGMA_API_KEY) {
      throw new Error('FIGMA_API_KEY is required');
    }

    const response = await this.fetchImpl(`https://api.figma.com/v1/teams/${encodeURIComponent(teamId)}/projects`, {
      headers: {
        'X-Figma-Token': process.env.FIGMA_API_KEY,
      },
    });
    if (!response.ok) {
      throw new Error(`figma team projects failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const data = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const projects = Array.isArray(data.projects) ? data.projects : [];
    return projects
      .filter((project): project is Record<string, unknown> => Boolean(project && typeof project === 'object'))
      .map((project) => ({
        id: String(project.id ?? ''),
        name: typeof project.name === 'string' ? project.name : 'Untitled Figma Project',
      }))
      .filter((project) => project.id);
  }

  async importDingTalkMeetingNote(input: {
    title?: string | null;
    content: string;
    subprojectId?: string | null;
  }): Promise<DingTalkMeetingImport> {
    const content = input.content.trim();
    if (!content) {
      throw new Error('content is required');
    }

    const id = `dingtalk-meeting-${randomUUID()}`;
    const title = input.title?.trim() || `DingTalk meeting note ${new Date().toISOString().slice(0, 10)}`;
    const importedAt = new Date().toISOString();
    const sourcePath = `${getInputInboxPath(input.subprojectId)}/${id}.md`;
    await this.store.write(
      sourcePath,
      [
        `# ${title}`,
        '',
        `- source: dingtalk-meeting-note`,
        `- importedAt: ${importedAt}`,
        '',
        '## Transcript / Minutes',
        '',
        content,
        '',
      ].join('\n'),
    );

    return {
      id,
      sourcePath,
      title,
      importedAt,
      charCount: content.length,
    };
  }

  private async safeNotionConnection() {
    try {
      return await this.notionService.isConnected();
    } catch {
      return false;
    }
  }

  private async safeFigmaConnection(input: { teamId: string | null; fileKey: string | null }) {
    try {
      if (input.teamId) {
        await this.listFigmaTeamProjects({ teamId: input.teamId });
        return true;
      }
      if (input.fileKey) {
        await this.inspectFigmaFile({ fileKey: input.fileKey });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private normalizeUrl(value: string) {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('url must start with http or https');
    }
    return url.toString();
  }

  private extractTitle(raw: string) {
    return raw.match(/<title[^>]*>(.*?)<\/title>/isu)?.[1]?.replace(/\s+/gu, ' ').trim() ?? null;
  }

  private htmlToText(raw: string) {
    return raw
      .replace(/<script[\s\S]*?<\/script>/giu, ' ')
      .replace(/<style[\s\S]*?<\/style>/giu, ' ')
      .replace(/<[^>]+>/gu, ' ')
      .replace(/&nbsp;/giu, ' ')
      .replace(/&amp;/giu, '&')
      .replace(/&lt;/giu, '<')
      .replace(/&gt;/giu, '>')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 50000);
  }

  private getDingTalkCandidateRoots() {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    return [
      process.env.DINGTALK_EXPORT_ROOT?.trim() || '',
      path.join(home, 'Documents', 'DingTalk'),
      path.join(home, 'Documents', '钉钉'),
      path.join(home, 'Downloads'),
      getInputInboxPath(null),
    ].filter(Boolean);
  }
}
