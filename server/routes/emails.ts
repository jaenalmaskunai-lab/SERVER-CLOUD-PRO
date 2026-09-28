import { Router } from 'express';
import { query, queryOne, run } from '../db/database';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Emails
router.get('/', (req: any, res) => {
  const accountId = req.query.account_id;
  let sql = `
    SELECT ea.*, ha.domain as account_domain
    FROM email_accounts ea
    JOIN hosting_accounts ha ON ea.hosting_account_id = ha.id
  `;
  const params: any[] = [];
  if (accountId) {
    sql += ' WHERE ea.hosting_account_id = ?';
    params.push(Number(accountId));
  }
  sql += ' ORDER BY ea.id DESC';

  const emails = query(sql, params);
  res.json(emails);
});

// Create Email Account
router.post('/', (req: any, res) => {
  const user = req.user;
  const { account_id, email_prefix, quota_mb, forward_to } = req.body;

  if (!account_id || !email_prefix) {
    return res.status(400).json({ error: 'Account ID dan username email wajib diisi' });
  }

  const account = queryOne<{ domain: string }>('SELECT domain FROM hosting_accounts WHERE id = ?', [Number(account_id)]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  const cleanPrefix = email_prefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const fullEmail = `${cleanPrefix}@${account.domain}`;

  const existing = queryOne('SELECT id FROM email_accounts WHERE email = ?', [fullEmail]);
  if (existing) {
    return res.status(400).json({ error: 'Alamat email sudah ada' });
  }

  const result = run(
    `INSERT INTO email_accounts (hosting_account_id, email, quota_mb, used_mb, forward_to)
     VALUES (?, ?, ?, 0.0, ?)`,
    [Number(account_id), fullEmail, Number(quota_mb) || 1024, forward_to || '']
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_EMAIL', 'email_account', String(result.lastInsertRowid), `Email: ${fullEmail}`);
  res.status(201).json({ success: true, emailId: result.lastInsertRowid, email: fullEmail });
});

// Update Email Forwarder / Autoresponder
router.put('/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { forward_to, is_autoresponder, autoresponder_body, quota_mb } = req.body;

  run(
    `UPDATE email_accounts 
     SET forward_to = ?, is_autoresponder = ?, autoresponder_body = ?, quota_mb = ?
     WHERE id = ?`,
    [forward_to || '', is_autoresponder ? 1 : 0, autoresponder_body || '', Number(quota_mb) || 1024, id]
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'UPDATE_EMAIL', 'email_account', String(id), `Updated email config ID: ${id}`);
  res.json({ success: true });
});

// Delete Email
router.delete('/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  run('DELETE FROM email_accounts WHERE id = ?', [id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DELETE_EMAIL', 'email_account', String(id), `Deleted email ID: ${id}`);
  res.json({ success: true });
});

export default router;
