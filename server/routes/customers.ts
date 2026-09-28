import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run, transaction } from '../db/database';
import { requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Customers (Admin sees all, Reseller sees theirs)
router.get('/', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  let sql = `
    SELECT u.id, u.username, u.email, u.full_name, u.phone, u.company, u.status, u.balance, u.created_at, u.reseller_id,
           r.full_name as reseller_name, rs.brand_name as reseller_brand,
           COUNT(ha.id) as total_accounts,
           COALESCE(SUM(ha.disk_used_mb), 0) as total_disk_used_mb
    FROM users u
    LEFT JOIN users r ON u.reseller_id = r.id
    LEFT JOIN reseller_settings rs ON r.id = rs.user_id
    LEFT JOIN hosting_accounts ha ON ha.customer_id = u.id
    WHERE u.role = 'customer'
  `;

  const params: any[] = [];
  if (user.role === 'reseller') {
    sql += ` AND u.reseller_id = ? `;
    params.push(user.id);
  }

  sql += ` GROUP BY u.id ORDER BY u.id DESC`;

  const customers = query(sql, params);
  res.json(customers);
});

// Create Customer
router.post('/', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  const { username, email, password, full_name, phone, company, reseller_id } = req.body;

  if (!username || !email || !password || !full_name) {
    return res.status(400).json({ error: 'Username, email, kata sandi, dan nama lengkap wajib diisi' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim()]);
  if (existing) {
    return res.status(400).json({ error: 'Username atau email sudah digunakan' });
  }

  // Resellers can only assign to themselves
  const assignedResellerId = user.role === 'reseller' ? user.id : (reseller_id ? Number(reseller_id) : null);

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const result = run(
    `INSERT INTO users (username, email, password_hash, role, reseller_id, full_name, phone, company, status, balance)
     VALUES (?, ?, ?, 'customer', ?, ?, ?, 'active', 0.0)`,
    [username.trim(), email.trim(), passwordHash, assignedResellerId, full_name.trim(), phone || '', company || '']
  );

  const customerId = result.lastInsertRowid;
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_CUSTOMER', 'user', String(customerId), `Customer: ${username}`);

  res.status(201).json({ success: true, customerId });
});

// Update Customer
router.put('/:id', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { full_name, phone, company, email, status } = req.body;

  let customer = queryOne<any>('SELECT * FROM users WHERE id = ? AND role = "customer"', [id]);
  if (!customer) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });

  if (user.role === 'reseller' && customer.reseller_id !== user.id) {
    return res.status(403).json({ error: 'Akses ditolak: Bukan pelanggan Anda' });
  }

  run(
    `UPDATE users SET full_name = ?, phone = ?, company = ?, email = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    [full_name, phone, company, email, status, id]
  );

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'UPDATE_CUSTOMER', 'user', String(id), `Updated customer: ${customer.username}`);
  res.json({ success: true });
});

// Suspend / Unsuspend Customer
router.post('/:id/toggle-status', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  let customer = queryOne<any>('SELECT * FROM users WHERE id = ? AND role = "customer"', [id]);
  if (!customer) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });

  if (user.role === 'reseller' && customer.reseller_id !== user.id) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  const newStatus = customer.status === 'active' ? 'suspended' : 'active';

  transaction(() => {
    run('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);
    if (newStatus === 'suspended') {
      run(`UPDATE hosting_accounts SET status = 'suspended', suspended_reason = 'Akun pelanggan disuspend' WHERE customer_id = ?`, [id]);
    } else {
      run(`UPDATE hosting_accounts SET status = 'active', suspended_reason = NULL WHERE customer_id = ?`, [id]);
    }
  });

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'SUSPEND_CUSTOMER', 'user', String(id), `Status: ${newStatus}`);
  res.json({ success: true, status: newStatus });
});

export default router;
