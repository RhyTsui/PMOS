import { Client, isFullPage } from '@notionhq/client';
import type { FileStore } from '../core/fileStore.js';

export type NotionConfig = {
  apiKey: string;
  databaseId?: string;
  prdDatabaseId?: string;
  meetingNotesDatabaseId?: string;
};

export type NotionPage = {
  id: string;
  url: string;
  title: string;
  createdTime: string;
  properties: Record<string, unknown>;
};

export type PRDRecord = {
  idea: string;
  business_analysis: string;
  user_analysis: string;
  data_metrics: string;
  ai_automation: string;
  technical_feasibility: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  score?: number;
};

export type MeetingNoteRecord = {
  date: string;
  project: string;
  topic: string;
  attendees: string[];
  content: string;
  decisions: string[];
  actionItems: Array<{ task: string; owner?: string; done: boolean }>;
};

type NotionSdkPage = {
  id: string;
  url: string;
  created_time: string;
  properties: Record<string, unknown>;
};

type NotionDatabaseQuery = (args: Record<string, unknown>) => Promise<{ results: unknown[] }>;
type NotionUsersMe = (args?: Record<string, unknown>) => Promise<unknown>;

export class NotionService {
  private client: Client;
  private config: NotionConfig;

  constructor(
    private readonly store: FileStore,
    config?: NotionConfig,
  ) {
    void this.store;

    this.config = config || {
      apiKey: process.env.NOTION_API_KEY || '',
      databaseId: process.env.NOTION_DATABASE_ID,
      prdDatabaseId: process.env.NOTION_PRD_DATABASE_ID,
      meetingNotesDatabaseId: process.env.NOTION_MEETING_NOTES_DATABASE_ID,
    };

    this.client = new Client({
      auth: this.config.apiKey,
    });
  }

  async isConnected(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      if (this.config.databaseId) {
        await this.client.databases.retrieve({
          database_id: this.config.databaseId,
        });
      } else {
        const me = (this.client.users as unknown as { me?: NotionUsersMe }).me;
        if (!me) {
          throw new Error('Current Notion client does not expose users.me');
        }
        await me({});
      }
      return true;
    } catch {
      return false;
    }
  }

  async syncPRD(prd: PRDRecord): Promise<NotionPage> {
    const databaseId = this.config.prdDatabaseId || this.config.databaseId;
    if (!databaseId) {
      throw new Error('Missing Notion PRD database id');
    }

    const page = await this.client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: prd.idea.slice(0, 100) } }],
        },
        Version: {
          rich_text: [{ text: { content: prd.version } }],
        },
        Status: {
          select: { name: prd.status },
        },
        Score: typeof prd.score === 'number' ? { number: prd.score } : undefined,
        'Created Time': {
          date: { start: new Date().toISOString() },
        },
      },
    } as Record<string, unknown>);

    const blocks = this.buildPRDBlocks(prd);
    if (blocks.length > 0) {
      await this.appendBlocks(page.id, blocks);
    }

    return this.toNotionPage(page as NotionSdkPage);
  }

  async syncMeetingNote(note: MeetingNoteRecord): Promise<NotionPage> {
    const databaseId = this.config.meetingNotesDatabaseId || this.config.databaseId;
    if (!databaseId) {
      throw new Error('Missing Notion meeting-notes database id');
    }

    const page = await this.client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: `${note.project} - ${note.topic}` } }],
        },
        Date: {
          date: { start: note.date },
        },
        Project: {
          rich_text: [{ text: { content: note.project } }],
        },
        Attendees: {
          multi_select: note.attendees.map((attendee) => ({ name: attendee })),
        },
      },
    } as Record<string, unknown>);

    await this.appendBlocks(page.id, this.buildMeetingNoteBlocks(note));

    return this.toNotionPage(page as NotionSdkPage);
  }

  async getPRDHistory(options?: { limit?: number }): Promise<NotionPage[]> {
    const databaseId = this.config.prdDatabaseId || this.config.databaseId;
    if (!databaseId) {
      throw new Error('Missing Notion database id');
    }

    const response = await this.queryDatabase({
      database_id: databaseId,
      page_size: options?.limit || 50,
      sorts: [{ property: 'Created Time', direction: 'descending' }],
    });

    return response.results
      .filter((page): page is NotionSdkPage => this.isFullPageResult(page))
      .map((page) => this.toNotionPage(page as unknown as NotionSdkPage));
  }

  async getMeetingNotes(options?: { project?: string; limit?: number }): Promise<NotionPage[]> {
    const databaseId = this.config.meetingNotesDatabaseId || this.config.databaseId;
    if (!databaseId) {
      throw new Error('Missing Notion database id');
    }

    const response = await this.queryDatabase({
      database_id: databaseId,
      page_size: options?.limit || 50,
      filter: options?.project
        ? {
            property: 'Project',
            rich_text: { contains: options.project },
          }
        : undefined,
      sorts: [{ property: 'Date', direction: 'descending' }],
    });

    return response.results
      .filter((page): page is NotionSdkPage => this.isFullPageResult(page))
      .map((page) => this.toNotionPage(page as unknown as NotionSdkPage));
  }

  async logDecision(decision: {
    projectId: string;
    title: string;
    context: string;
    decision: string;
    rationale: string;
    alternatives: string[];
  }): Promise<NotionPage> {
    const databaseId = this.config.databaseId;
    if (!databaseId) {
      throw new Error('Missing Notion database id');
    }

    const page = await this.client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: decision.title } }],
        },
        Project: {
          rich_text: [{ text: { content: decision.projectId } }],
        },
        'Decision Type': {
          select: { name: 'Product Decision' },
        },
        Date: {
          date: { start: new Date().toISOString() },
        },
      },
    } as Record<string, unknown>);

    const blocks: Array<Record<string, unknown>> = [
      this.heading('背景'),
      this.paragraph(decision.context),
      this.heading('决策'),
      this.paragraph(decision.decision),
      this.heading('理由'),
      this.paragraph(decision.rationale),
      this.heading('备选方案'),
      ...decision.alternatives.map((alternative) => this.bullet(alternative)),
    ];

    await this.appendBlocks(page.id, blocks);

    return this.toNotionPage(page as NotionSdkPage);
  }

  async search(query: string): Promise<NotionPage[]> {
    const response = await this.client.search({
      query,
      filter: { property: 'object', value: 'page' },
    });

    return response.results
      .filter(isFullPage)
      .map((page) => this.toNotionPage(page as unknown as NotionSdkPage));
  }

  private buildPRDBlocks(prd: PRDRecord): Array<Record<string, unknown>> {
    const blocks: Array<Record<string, unknown>> = [];

    this.pushSection(blocks, '商业分析', prd.business_analysis);
    this.pushSection(blocks, '用户分析', prd.user_analysis);
    this.pushSection(blocks, '数据指标', prd.data_metrics);
    this.pushSection(blocks, 'AI 自动化', prd.ai_automation);
    this.pushSection(blocks, '技术可行性', prd.technical_feasibility);

    return blocks;
  }

  private buildMeetingNoteBlocks(note: MeetingNoteRecord): Array<Record<string, unknown>> {
    const blocks: Array<Record<string, unknown>> = [
      this.heading('讨论内容'),
      this.paragraph(note.content),
    ];

    if (note.decisions.length > 0) {
      blocks.push(this.heading('决策事项'));
      blocks.push(...note.decisions.map((decision) => this.bullet(decision)));
    }

    if (note.actionItems.length > 0) {
      blocks.push(this.heading('待办事项'));
      blocks.push(
        ...note.actionItems.map((item) => ({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{ type: 'text', text: { content: item.task } }],
            checked: item.done,
          },
        })),
      );
    }

    return blocks;
  }

  private pushSection(blocks: Array<Record<string, unknown>>, title: string, content: string) {
    if (!content) {
      return;
    }

    blocks.push(this.heading(title));
    blocks.push(this.paragraph(content));
  }

  private heading(content: string): Record<string, unknown> {
    return {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content } }],
      },
    };
  }

  private paragraph(content: string): Record<string, unknown> {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content } }],
      },
    };
  }

  private bullet(content: string): Record<string, unknown> {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content } }],
      },
    };
  }

  private async queryDatabase(args: Record<string, unknown>): Promise<{ results: unknown[] }> {
    const query = (this.client.databases as unknown as { query?: NotionDatabaseQuery }).query;
    if (!query) {
      throw new Error('Current Notion client does not expose databases.query');
    }

    return query(args);
  }

  private async appendBlocks(blockId: string, children: Array<Record<string, unknown>>) {
    const append = this.client.blocks.children.append as unknown as (args: {
      block_id: string;
      children: Array<Record<string, unknown>>;
    }) => Promise<unknown>;

    await append({
      block_id: blockId,
      children,
    });
  }

  private isFullPageResult(page: unknown): page is NotionSdkPage {
    return isFullPage(page as never);
  }

  private toNotionPage(page: NotionSdkPage): NotionPage {
    return {
      id: page.id,
      url: page.url,
      title: this.extractTitle(page.properties),
      createdTime: page.created_time,
      properties: page.properties,
    };
  }

  private extractTitle(properties: Record<string, unknown>) {
    for (const property of Object.values(properties)) {
      if (!property || typeof property !== 'object') {
        continue;
      }

      const candidate = property as {
        type?: string;
        title?: Array<{ plain_text?: string }>;
      };
      if (candidate.type === 'title') {
        return candidate.title?.[0]?.plain_text || 'Untitled';
      }
    }

    return 'Untitled';
  }
}

export function checkNotionConfig(): {
  configured: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!process.env.NOTION_API_KEY) {
    missing.push('NOTION_API_KEY');
  }

  if (!process.env.NOTION_DATABASE_ID) {
    missing.push('NOTION_DATABASE_ID');
  }

  return {
    configured: missing.length === 0,
    missing,
  };
}
