import { NextResponse } from 'next/server';

type InputTable = {
  name: string;
  rows: Array<Record<string, unknown>>;
};

function inferDuckType(values: unknown[]): string {
  const filtered = values.filter((v) => v !== null && v !== undefined);
  if (filtered.length === 0) return 'VARCHAR';
  if (filtered.every((v) => typeof v === 'number' && Number.isFinite(v))) return 'DOUBLE';
  if (filtered.every((v) => typeof v === 'boolean')) return 'BOOLEAN';
  return 'VARCHAR';
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null) as null | { sql?: string; tables?: InputTable[] };
  const sql = String(payload?.sql || '').trim();
  const tables = Array.isArray(payload?.tables) ? payload!.tables : [];
  if (!sql) {
    return NextResponse.json({ ok: false, error: 'missing_sql' }, { status: 400 });
  }

  // DuckDB native binding pulls in node-pre-gyp internals that Turbopack can't bundle.
  // Use a runtime require to keep it server-only.
  // eslint-disable-next-line no-eval
  const duckdb = (eval('require') as (name: string) => any)('duckdb') as typeof import('duckdb');
  const db = new duckdb.Database(':memory:');
  const conn = db.connect();

  const run = (text: string, params?: unknown[]) => new Promise<void>((resolve, reject) => {
    conn.run(text, params || [], (err: Error | null) => (err ? reject(err) : resolve()));
  });

  const all = (text: string) => new Promise<any[]>((resolve, reject) => {
    conn.all(text, (err: Error | null, rows: any[]) => (err ? reject(err) : resolve(rows || [])));
  });

  try {
    for (const table of tables) {
      const name = String(table?.name || '').trim();
      if (!name) continue;
      const rows = Array.isArray(table.rows) ? table.rows : [];
      const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
      if (columns.length === 0) {
        await run(`CREATE TABLE "${name}" (dummy VARCHAR)`);
        continue;
      }

      const types = columns.map((col) => {
        const vals = rows.map((r) => (r as any)?.[col]);
        return inferDuckType(vals);
      });
      const ddl = columns.map((col, idx) => `"${col}" ${types[idx]}`).join(', ');
      await run(`CREATE TABLE "${name}" (${ddl})`);

      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO "${name}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map((col) => (row as any)?.[col] ?? null);
        await run(insertSql, values);
      }
    }

    const rows = await all(sql);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return NextResponse.json({ ok: true, columns, rows });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'query_failed' }, { status: 500 });
  } finally {
    try { conn.close(); } catch {}
  }
}
