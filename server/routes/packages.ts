import { Router } from 'express';
import { query, queryOne, run } from '../db/database';
import { requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Packages
router.get('/', (req: any, res) => {
  const user = req.user;
  let sql = `
    SELECT hp.*, u.full_name as reseller_name,
           COUNT(ha.id) as accounts_count
    FROM hosting_packages hp
    LEFT JOIN users u ON hp.reseller_id = u.id
    LEFT JOIN hosting_accounts ha ON ha.package_id = hp.id
  `;

  const params: any[] = [];
  if (user?.role === 'reseller') {
    sql += ` WHERE hp.reseller_id = ? OR hp.reseller_id IS NULL `;
    params.push(user.id);
  } else if (user?.role === 'customer' && user.reseller_id) {
    sql += ` WHERE hp.reseller_id = ? `;
    params.push(user.reseller_id);
  }

  sql += ` GROUP BY hp.id ORDER BY hp.price_monthly ASC`;

  const packages = query(sql, params);
  res.json(packages);
});

// Create Package
router.post('/', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  const {
    name,
    disk_mb,
    bandwidth_mb,
    cpu_percent,
    ram_mb,
    max_domains,
    max_subdomains,
    max_databases,
    max_emails,
    max_ftp,
    max_cron,
    price_monthly,
    price_annual
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Nama paket wajib diisi' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  const assignedResellerId = user.role === 'reseller' ? user.id : null;

  const result = run(
    `INSERT INTO hosting_packages 
     (name, slug, reseller_id, disk_mb, bandwidth_mb, cpu_percent, ram_mb, max_domains, max_subdomains, max_databases, max_emails, max_ftp, max_cron, price_monthly, price_annual)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      slug,
      assignedResellerId,
      Number(disk_mb) || 5120,
      Number(bandwidth_mb) || 51200,
      Number(cpu_percent) || 100,
      Number(ram_mb) || 1024,
      Number(max_domains) || 1,
      Number(max_subdomains) || 5,
      Number(max_databases) || 3,
      Number(max_emails) || 5,
      Number(max_ftp) || 2,
      Number(max_cron) || 3,
      Number(price_monthly) || 50000,
      Number(price_annual) || 500000
    ]
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_PACKAGE', 'hosting_package', String(result.lastInsertRowid), `Package: ${name}`);
  res.status(201).json({ success: true, packageId: result.lastInsertRowid });
});

// Delete Package
router.delete('/:id', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const inUse = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM hosting_accounts WHERE package_id = ?', [id]);
  if (inUse && inUse.count > 0) {
    return res.status(400).json({ error: 'Paket ini tidak dapat dihapus karena masih digunakan oleh akun hosting aktif.' });
  }

  let sql = 'DELETE FROM hosting_packages WHERE id = ?';
  const params: any[] = [id];
  if (user.role === 'reseller') {
    sql += ' AND reseller_id = ?';
    params.push(user.id);
  }

  run(sql, params);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DELETE_PACKAGE', 'hosting_package', String(id), `Deleted package ID: ${id}`);
  res.json({ success: true });
});

export default router;
