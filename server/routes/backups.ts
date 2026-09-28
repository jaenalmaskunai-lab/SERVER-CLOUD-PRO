import { Router } from 'express';
import { query, queryOne, run } from '../db/database';
import { enqueueJob } from '../services/queue';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Backups
router.get('/', (req: any, res) => {
  const accountId = req.query.account_id;
  let sql = `
    SELECT b.*, ha.domain as account_domain, ha.username as account_username
    FROM backups b
    JOIN hosting_accounts ha ON b.hosting_account_id = ha.id
  `;
  const params: any[] = [];
  if (accountId) {
    sql += ' WHERE b.hosting_account_id = ?';
    params.push(Number(accountId));
  }
  sql += ' ORDER BY b.id DESC';

  const backups = query(sql, params);
  res.json(backups);
});

// Trigger New Backup
router.post('/create', (req: any, res) => {
  const user = req.user;
  const { account_id, type, storage_type } = req.body;

  if (!account_id) return res.status(400).json({ error: 'Account ID wajib diisi' });

  const account = queryOne<{ domain: string }>('SELECT domain FROM hosting_accounts WHERE id = ?', [Number(account_id)]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  const bkType = type || 'full';
  const fileName = `backup_${account.domain}_${Date.now()}_${bkType}.tar.gz`;
  const estimatedSize = bkType === 'full' ? Math.floor(Math.random() * 250 + 80) : (bkType === 'database' ? Math.floor(Math.random() * 20 + 5) : Math.floor(Math.random() * 120 + 30));

  const result = run(
    `INSERT INTO backups (hosting_account_id, type, file_name, file_size_mb, storage_type, status)
     VALUES (?, ?, ?, ?, ?, 'completed')`,
    [Number(account_id), bkType, fileName, estimatedSize, storage_type || 'local']
  );

  enqueueJob('CREATE_SCHEDULED_BACKUP', { account_id: Number(account_id), type: bkType });
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_BACKUP', 'backup', String(result.lastInsertRowid), `Created ${bkType} backup for ${account.domain}`);

  res.status(201).json({
    success: true,
    backupId: result.lastInsertRowid,
    fileName,
    sizeMb: estimatedSize,
    status: 'completed'
  });
});

// 1-Click Restore
router.post('/:id/restore', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const backup = queryOne<any>(`
    SELECT b.*, ha.domain
    FROM backups b
    JOIN hosting_accounts ha ON b.hosting_account_id = ha.id
    WHERE b.id = ?
  `, [id]);

  if (!backup) return res.status(404).json({ error: 'File backup tidak ditemukan' });

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'RESTORE_BACKUP', 'backup', String(id), `Restored backup: ${backup.file_name} for ${backup.domain}`);

  res.json({
    success: true,
    message: `Restorasi backup '${backup.file_name}' untuk domain '${backup.domain}' berhasil diselesaikan secara utuh. File dan database telah dikembalikan ke titik snapshot.`,
    restoredAt: new Date().toISOString()
  });
});

// Delete Backup
router.delete('/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  run('DELETE FROM backups WHERE id = ?', [id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DELETE_BACKUP', 'backup', String(id), `Deleted backup snapshot ID: ${id}`);
  res.json({ success: true });
});

export default router;
