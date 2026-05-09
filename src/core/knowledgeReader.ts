import * as XLSX from 'xlsx';
import { FileStore } from '../core/fileStore.js';

export type DocumentType = 'markdown' | 'docx' | 'excel' | 'unknown';

export type ParsedDocument = {
  path: string;
  type: DocumentType;
  content: string;
  metadata: {
    title?: string;
    date?: string;
    project?: string;
    [key: string]: string | undefined;
  };
  tables?: Array<{
    name: string;
    headers: string[];
    rows: string[][];
  }>;
};

export class KnowledgeReader {
  constructor(private readonly store: FileStore) {}

  async readDocument(path: string): Promise<ParsedDocument> {
    const type = this.detectType(path);

    switch (type) {
      case 'markdown':
        return this.readMarkdown(path);
      case 'docx':
        return this.readDocx(path);
      case 'excel':
        return this.readExcel(path);
      default:
        throw new Error(`Unsupported document type: ${path}`);
    }
  }

  async readFolder(folderPath: string): Promise<ParsedDocument[]> {
    const documents: ParsedDocument[] = [];

    try {
      const entries = await this.store.list(folderPath);
      for (const entry of entries) {
        if (this.detectType(entry) === 'unknown') {
          continue;
        }

        try {
          documents.push(await this.readDocument(entry));
        } catch (error) {
          console.warn(`Failed to read ${entry}`, error);
        }
      }
    } catch (error) {
      console.warn(`Failed to read folder ${folderPath}`, error);
    }

    return documents;
  }

  async readWeeklyReports(): Promise<ParsedDocument[]> {
    return this.readFolder('knowledge/weekly-reports');
  }

  async readMeetingNotes(): Promise<ParsedDocument[]> {
    return this.readFolder('knowledge/meeting-notes');
  }

  async readOKRs(): Promise<ParsedDocument[]> {
    return this.readFolder('knowledge/quarterly-okrs');
  }

  private detectType(path: string): DocumentType {
    const ext = path.toLowerCase().split('.').pop();

    switch (ext) {
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'docx':
        return 'docx';
      case 'xlsx':
      case 'xls':
        return 'excel';
      default:
        return 'unknown';
    }
  }

  private async readMarkdown(path: string): Promise<ParsedDocument> {
    const content = await this.store.read(path);

    return {
      path,
      type: 'markdown',
      content,
      metadata: this.extractMetadata(content),
    };
  }

  private async readDocx(path: string): Promise<ParsedDocument> {
    const mammoth = await import('mammoth');
    const buffer = Buffer.from(await this.store.read(path, 'binary'), 'binary');
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value;

    return {
      path,
      type: 'docx',
      content,
      metadata: this.extractMetadata(content),
    };
  }

  private async readExcel(path: string): Promise<ParsedDocument> {
    const buffer = Buffer.from(await this.store.read(path, 'binary'), 'binary');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const tables: NonNullable<ParsedDocument['tables']> = [];
    let content = '';

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as Array<Array<string | number | boolean | null | undefined>>;

      if (rows.length === 0) {
        continue;
      }

      const headers = (rows[0] || []).map((cell) => String(cell ?? ''));
      const tableRows = rows.slice(1).map((row) => row.map((cell) => String(cell ?? '')));

      tables.push({
        name: sheetName,
        headers,
        rows: tableRows,
      });

      content += `## ${sheetName}\n\n`;
      content += `| ${headers.join(' | ')} |\n`;
      content += `| ${headers.map(() => '---').join(' | ')} |\n`;
      for (const row of tableRows) {
        content += `| ${row.join(' | ')} |\n`;
      }
      content += '\n';
    }

    const okrMatch = path.match(/(\d{4})-Q(\d+)-OKR/i);

    return {
      path,
      type: 'excel',
      content,
      metadata: {
        title: tables[0]?.name || 'Spreadsheet',
        year: okrMatch?.[1],
        quarter: okrMatch?.[2],
      },
      tables,
    };
  }

  private extractMetadata(content: string): ParsedDocument['metadata'] {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const dateMatch = content.match(/日期[:：]?\s*([\d-]+)/i);
    const projectMatch = content.match(/项目[:：]?\s*(.+)/i);

    return {
      title: titleMatch?.[1]?.trim(),
      date: dateMatch?.[1]?.trim(),
      project: projectMatch?.[1]?.trim(),
    };
  }
}
