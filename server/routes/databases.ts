import { Router } from 'express';
import { query, queryOne, run } from '../db/database';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Databases
router.get('/', (req: any, res) => {
  const accountId = req.query.account_id;
  let sql = `
    SELECT db.*, ha.domain as account_domain, ha.username as account_username
    FROM databases db
    JOIN hosting_accounts ha ON db.hosting_account_id = ha.id
  `;
  const params: any[] = [];
  if (accountId) {
    sql += ' WHERE db.hosting_account_id = ?';
    params.push(Number(accountId));
  }
  sql += ' ORDER BY db.id DESC';

  const dbs = query(sql, params);
  res.json(dbs);
});

// Create Database
router.post('/', (req: any, res) => {
  const user = req.user;
  const { account_id, db_name, db_user, charset } = req.body;

  if (!account_id || !db_name || !db_user) {
    return res.status(400).json({ error: 'Account ID, nama database, dan database user wajib diisi' });
  }

  const account = queryOne<{ username: string }>('SELECT username FROM hosting_accounts WHERE id = ?', [Number(account_id)]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  // Prefix database with account username according to hosting conventions
  const fullDbName = db_name.startsWith(`${account.username}_`) ? db_name : `${account.username}_${db_name}`;
  const fullDbUser = db_user.startsWith(`${account.username}_`) ? db_user : `${account.username}_${db_user}`;

  const result = run(
    `INSERT INTO databases (hosting_account_id, db_name, db_user, charset, size_mb)
     VALUES (?, ?, ?, ?, 0.1)`,
    [Number(account_id), fullDbName, fullDbUser, charset || 'utf8mb4']
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_DATABASE', 'database', String(result.lastInsertRowid), `Database: ${fullDbName}`);
  res.status(201).json({ success: true, databaseId: result.lastInsertRowid, db_name: fullDbName, db_user: fullDbUser });
});

// Delete Database
router.delete('/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const db = queryOne<{ db_name: string }>('SELECT db_name FROM databases WHERE id = ?', [id]);
  if (!db) return res.status(404).json({ error: 'Database tidak ditemukan' });

  run('DELETE FROM databases WHERE id = ?', [id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DELETE_DATABASE', 'database', String(id), `Deleted DB: ${db.db_name}`);
  res.json({ success: true });
});

export default router;
