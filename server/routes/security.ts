import { Router } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db/database';
import { requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// Audit Logs
router.get('/audit-logs', (req: any, res) => {
  const user = req.user;
  let sql = `
    SELECT al.*, u.full_name, u.username
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
  `;

  const params: any[] = [];
  if (user.role === 'reseller') {
    sql += ' WHERE al.user_id = ? OR al.user_id IN (SELECT id FROM users WHERE reseller_id = ?)';
    params.push(user.id, user.id);
  } else if (user.role === 'customer') {
    sql += ' WHERE al.user_id = ?';
    params.push(user.id);
  }

  sql += ' ORDER BY al.id DESC LIMIT 100';

  const logs = query(sql, params);
  res.json(logs);
});

// IP Firewall Rules
router.get('/firewall', requireRole(['admin']), (req, res) => {
  const rules = query('SELECT * FROM ip_firewall ORDER BY id DESC');
  res.json(rules);
});

// Add Firewall Rule
router.post('/firewall', requireRole(['admin']), (req: any, res) => {
  const { ip_address, type, note } = req.body;

  if (!ip_address) return res.status(400).json({ error: 'Alamat IP atau CIDR wajib diisi' });

  const result = run(
    `INSERT INTO ip_firewall (ip_address, type, note) VALUES (?, ?, ?)`,
    [ip_address.trim(), type || 'blacklist', note || 'Dibuat secara manual oleh Administrator']
  );

  recordAuditLog(req.user.id, req.user.role, req.ip || '127.0.0.1', 'ADD_FIREWALL_RULE', 'firewall', String(result.lastInsertRowid), `${type} for ${ip_address}`);
  res.status(201).json({ success: true, ruleId: result.lastInsertRowid });
});

// Delete Firewall Rule
router.delete('/firewall/:id', requireRole(['admin']), (req: any, res) => {
  const id = Number(req.params.id);
  run('DELETE FROM ip_firewall WHERE id = ?', [id]);
  recordAuditLog(req.user.id, req.user.role, req.ip || '127.0.0.1', 'DELETE_FIREWALL_RULE', 'firewall', String(id), `Deleted firewall rule ID: ${id}`);
  res.json({ success: true });
});

// API Keys
router.get('/api-keys', (req: any, res) => {
  const user = req.user;
  const keys = query('SELECT id, key_name, api_key, scopes, rate_limit_per_min, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY id DESC', [user.id]);
  const parsed = keys.map((k: any) => ({
    ...k,
    scopes: JSON.parse(k.scopes || '[]')
  }));
  res.json(parsed);
});

// Generate API Key
router.post('/api-keys', (req: any, res) => {
  const user = req.user;
  const { key_name, scopes, rate_limit } = req.body;

  if (!key_name) return res.status(400).json({ error: 'Nama label API Key wajib diisi' });

  const randomPart = crypto.randomBytes(16).toString('hex');
  const apiKey = `cpro_live_${randomPart}`;

  const result = run(
    `INSERT INTO api_keys (user_id, key_name, api_key, scopes, rate_limit_per_min)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, key_name, apiKey, JSON.stringify(scopes || ['read', 'provision']), Number(rate_limit) || 60]
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'GENERATE_API_KEY', 'api_key', String(result.lastInsertRowid), `Generated key: ${key_name}`);
  res.status(201).json({
    success: true,
    apiKey,
    key_name
  });
});

// Revoke API Key
router.delete('/api-keys/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  run('DELETE FROM api_keys WHERE id = ? AND user_id = ?', [id, user.id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'REVOKE_API_KEY', 'api_key', String(id), `Revoked API key ID: ${id}`);
  res.json({ success: true });
});

export default router;
