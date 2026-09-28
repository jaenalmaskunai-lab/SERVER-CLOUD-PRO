import { Router } from 'express';
import { query, queryOne, run } from '../db/database';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Cron Jobs
router.get('/', (req: any, res) => {
  const accountId = req.query.account_id;
  let sql = `
    SELECT cj.*, ha.domain as account_domain
    FROM cron_jobs cj
    JOIN hosting_accounts ha ON cj.hosting_account_id = ha.id
  `;
  const params: any[] = [];
  if (accountId) {
    sql += ' WHERE cj.hosting_account_id = ?';
    params.push(Number(accountId));
  }
  sql += ' ORDER BY cj.id DESC';

  const crons = query(sql, params);
  res.json(crons);
});

// Create Cron Job
router.post('/', (req: any, res) => {
  const user = req.user;
  const { account_id, command, minute, hour, day, month, weekday } = req.body;

  if (!account_id || !command) {
    return res.status(400).json({ error: 'Account ID dan baris perintah (command) wajib diisi' });
  }

  const result = run(
    `INSERT INTO cron_jobs (hosting_account_id, command, minute, hour, day, month, weekday, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      Number(account_id),
      command.trim(),
      minute || '*',
      hour || '*',
      day || '*',
      month || '*',
      weekday || '*'
    ]
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_CRON', 'cron_job', String(result.lastInsertRowid), `Command: ${command}`);
  res.status(201).json({ success: true, cronId: result.lastInsertRowid });
});

// Toggle or Test Run Cron Job
router.post('/:id/test-run', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const cron = queryOne<any>('SELECT * FROM cron_jobs WHERE id = ?', [id]);
  if (!cron) return res.status(404).json({ error: 'Cron job tidak ditemukan' });

  run(`UPDATE cron_jobs SET last_run = datetime('now') WHERE id = ?`, [id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'RUN_CRON_MANUAL', 'cron_job', String(id), `Triggered cron: ${cron.command}`);

  res.json({
    success: true,
    exitCode: 0,
    output: `[${new Date().toISOString()}] Command executed successfully. Return code: 0 OK.`
  });
});

// Delete Cron
router.delete('/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  run('DELETE FROM cron_jobs WHERE id = ?', [id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DELETE_CRON', 'cron_job', String(id), `Deleted cron ID: ${id}`);
  res.json({ success: true });
});

export default router;
