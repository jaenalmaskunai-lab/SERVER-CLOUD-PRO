import { Router } from 'express';
import { query, queryOne, run, transaction } from '../db/database';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Zones
router.get('/zones', (req: any, res) => {
  const user = req.user;
  const accountId = req.query.account_id;

  let sql = `
    SELECT dz.*, ha.domain as account_domain, ha.customer_id, ha.reseller_id,
           COUNT(dr.id) as record_count
    FROM dns_zones dz
    JOIN hosting_accounts ha ON dz.hosting_account_id = ha.id
    LEFT JOIN dns_records dr ON dr.zone_id = dz.id
  `;

  const params: any[] = [];
  const conditions: string[] = [];

  if (accountId) {
    conditions.push('dz.hosting_account_id = ?');
    params.push(Number(accountId));
  }

  if (user?.role === 'customer') {
    conditions.push('ha.customer_id = ?');
    params.push(user.id);
  } else if (user?.role === 'reseller') {
    conditions.push('ha.reseller_id = ?');
    params.push(user.id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY dz.id ORDER BY dz.id DESC';

  const zones = query(sql, params);
  res.json(zones);
});

// Get Records for a Zone
router.get('/zones/:id/records', (req, res) => {
  const zoneId = Number(req.params.id);
  const records = query('SELECT * FROM dns_records WHERE zone_id = ? ORDER BY type ASC, name ASC', [zoneId]);
  res.json(records);
});

// Add DNS Record
router.post('/records', (req: any, res) => {
  const user = req.user;
  const { zone_id, type, name, content, ttl, priority } = req.body;

  if (!zone_id || !type || !name || !content) {
    return res.status(400).json({ error: 'Zone ID, tipe record, nama, dan konten wajib diisi' });
  }

  const result = run(
    `INSERT INTO dns_records (zone_id, type, name, content, ttl, priority)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Number(zone_id),
      type.toUpperCase(),
      name.trim(),
      content.trim(),
      Number(ttl) || 3600,
      priority ? Number(priority) : null
    ]
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'ADD_DNS_RECORD', 'dns_record', String(result.lastInsertRowid), `${type} ${name} -> ${content}`);
  res.status(201).json({ success: true, recordId: result.lastInsertRowid });
});

// Update DNS Record
router.put('/records/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { type, name, content, ttl, priority } = req.body;

  run(
    `UPDATE dns_records SET type = ?, name = ?, content = ?, ttl = ?, priority = ? WHERE id = ?`,
    [type.toUpperCase(), name.trim(), content.trim(), Number(ttl) || 3600, priority ? Number(priority) : null, id]
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'UPDATE_DNS_RECORD', 'dns_record', String(id), `Updated ${type} ${name}`);
  res.json({ success: true });
});

// Delete DNS Record
router.delete('/records/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  run('DELETE FROM dns_records WHERE id = ?', [id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DELETE_DNS_RECORD', 'dns_record', String(id), `Deleted DNS record ID: ${id}`);
  res.json({ success: true });
});

// Apply Pre-built DNS Template
router.post('/zones/:id/apply-template', (req: any, res) => {
  const user = req.user;
  const zoneId = Number(req.params.id);
  const { template } = req.body;

  const zone = queryOne<{ domain: string }>('SELECT domain FROM dns_zones WHERE id = ?', [zoneId]);
  if (!zone) return res.status(404).json({ error: 'DNS zone tidak ditemukan' });

  transaction(() => {
    if (template === 'google_workspace') {
      // Remove existing MX and SPF
      run(`DELETE FROM dns_records WHERE zone_id = ? AND (type = 'MX' OR (type = 'TXT' AND content LIKE '%v=spf1%'))`, [zoneId]);

      // Add Google Workspace MX records
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl, priority) VALUES (?, 'MX', '@', 'aspmx.l.google.com', 3600, 1)`, [zoneId]);
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl, priority) VALUES (?, 'MX', '@', 'alt1.aspmx.l.google.com', 3600, 5)`, [zoneId]);
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl, priority) VALUES (?, 'MX', '@', 'alt2.aspmx.l.google.com', 3600, 5)`, [zoneId]);
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl, priority) VALUES (?, 'MX', '@', 'aspmx2.googlemail.com', 3600, 10)`, [zoneId]);
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl, priority) VALUES (?, 'MX', '@', 'aspmx3.googlemail.com', 3600, 10)`, [zoneId]);
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'TXT', '@', 'v=spf1 include:_spf.google.com ~all', 3600)`, [zoneId]);
    } else if (template === 'microsoft_365') {
      run(`DELETE FROM dns_records WHERE zone_id = ? AND type = 'MX'`, [zoneId]);
      const domainSlug = zone.domain.replace(/\./g, '-');
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl, priority) VALUES (?, 'MX', '@', '${domainSlug}.mail.protection.outlook.com', 3600, 0)`, [zoneId]);
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'CNAME', 'autodiscover', 'autodiscover.outlook.com', 3600)`, [zoneId]);
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'TXT', '@', 'v=spf1 include:spf.protection.outlook.com -all', 3600)`, [zoneId]);
    } else if (template === 'cloudflare_proxy') {
      run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'TXT', '_cf-custom-hostname', 'cf-proxy-managed-by-cloudpro', 3600)`, [zoneId]);
    }

    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'APPLY_DNS_TEMPLATE', 'dns_zone', String(zoneId), `Template: ${template} applied to ${zone.domain}`);
  });

  const updatedRecords = query('SELECT * FROM dns_records WHERE zone_id = ? ORDER BY type ASC', [zoneId]);
  res.json({ success: true, records: updatedRecords });
});

export default router;
