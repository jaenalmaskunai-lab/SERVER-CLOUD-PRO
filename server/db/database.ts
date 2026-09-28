import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

let dbInstance: SqlJsDatabase | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'cloudpro.sqlite');
let saveTimeout: NodeJS.Timeout | null = null;

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Always enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Run schema initialization
  const schemaPath = path.resolve(process.cwd(), 'server/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    dbInstance.run(schemaSql);
  }

  // Check if initial seeding is needed
  const userCountResult = dbInstance.exec('SELECT COUNT(*) as count FROM users');
  const count = userCountResult[0]?.values[0]?.[0] as number ?? 0;
  if (count === 0) {
    const { seedInitialData } = await import('./seed');
    await seedInitialData(dbInstance);
  }

  persistNow();
  return dbInstance;
}

export function persistNow() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

export function schedulePersist() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    persistNow();
  }, 250);
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized. Call getDb() first.');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!dbInstance) throw new Error('Database not initialized. Call getDb() first.');
  dbInstance.run(sql, params);
  
  const idResult = dbInstance.exec('SELECT last_insert_rowid() as id, changes() as changes');
  const lastInsertRowid = (idResult[0]?.values[0]?.[0] as number) ?? 0;
  const changes = (idResult[0]?.values[0]?.[1] as number) ?? 0;

  schedulePersist();
  return { lastInsertRowid, changes };
}

export function transaction<T>(callback: () => T): T {
  if (!dbInstance) throw new Error('Database not initialized.');
  dbInstance.run('BEGIN TRANSACTION;');
  try {
    const result = callback();
    dbInstance.run('COMMIT;');
    schedulePersist();
    return result;
  } catch (err) {
    dbInstance.run('ROLLBACK;');
    throw err;
  }
}
