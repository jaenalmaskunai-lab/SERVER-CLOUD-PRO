import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run, transaction } from '../db/database';
import { requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Resellers (Admin only)
router.get('/', requireRole(['admin']), (req, res) => {
  const resellers = query(`
    SELECT u.id, u.username, u.email, u.full_name, u.phone, u.company, u.status, u.balance, u.created_at,
           rs.brand_name, rs.custom_domain, rs.accent_color,
           COUNT(DISTINCT c.id) as total_customers,
           COUNT(DISTINCT ha.id) as total_accounts,
           COALESCE(SUM(ha.disk_used_mb), 0) as total_disk_used_mb,
           COALESCE(SUM(ha.bandwidth_used_mb), 0) as total_bandwidth_used_mb
    FROM users u
    LEFT JOIN reseller_settings rs ON u.id = rs.user_id
    LEFT JOIN users c ON c.reseller_id = u.id AND c.role = 'customer'
    LEFT JOIN hosting_accounts ha ON ha.reseller_id = u.id
    WHERE u.role = 'reseller'
    GROUP BY u.id
    ORDER BY u.id DESC
  `);
  res.json(resellers);
});

// Create Reseller
router.post('/', requireRole(['admin']), (req: any, res) => {
  const { username, email, password, full_name, phone, company, brand_name, custom_domain, initial_balance } = req.body;

  if (!username || !email || !password || !full_name) {
    return res.status(400).json({ error: 'Username, email, kata sandi, dan nama lengkap wajib diisi' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    return res.status(400).json({ error: 'Username atau email sudah digunakan' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const result = transaction(() => {
    const userRes = run(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, company, status, balance)
       VALUES (?, ?, ?, 'reseller', ?, ?, ?, 'active', ?)`,
      [username, email, passwordHash, full_name, phone || '', company || '', Number(initial_balance) || 0]
    );

    const resellerId = userRes.lastInsertRowid;

    run(
      `INSERT INTO reseller_settings (user_id, brand_name, custom_domain)
       VALUES (?, ?, ?)`,
      [resellerId, brand_name || `${full_name} Cloud`, custom_domain || `panel.${username}.com`]
    );

    recordAuditLog(req.user.id, req.user.role, req.ip || '127.0.0.1', 'CREATE_RESELLER', 'user', String(resellerId), `Created reseller: ${username}`);
    return resellerId;
  });

  res.status(201).json({ success: true, resellerId: result });
});

// Update Reseller
router.put('/:id', requireRole(['admin']), (req: any, res) => {
  const id = Number(req.params.id);
  const { full_name, phone, company, email, status } = req.body;

  run(
    `UPDATE users SET full_name = ?, phone = ?, company = ?, email = ?, status = ?, updated_at = datetime('now') WHERE id = ? AND role = 'reseller'`,
    [full_name, phone, company, email, status, id]
  );

  recordAuditLog(req.user.id, req.user.role, req.ip || '127.0.0.1', 'UPDATE_RESELLER', 'user', String(id), `Updated reseller ID ${id}`);
  res.json({ success: true });
});

// Suspend / Unsuspend Reseller (Cascades to customer accounts!)
router.post('/:id/toggle-status', requireRole(['admin']), (req: any, res) => {
  const id = Number(req.params.id);
  const reseller = queryOne<any>('SELECT * FROM users WHERE id = ? AND role = "reseller"', [id]);

  if (!reseller) return res.status(404).json({ error: 'Reseller tidak ditemukan' });

  const newStatus = reseller.status === 'active' ? 'suspended' : 'active';

  transaction(() => {
    run('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);

    // Cascade suspension to their hosting accounts if suspended
    if (newStatus === 'suspended') {
      run(`UPDATE hosting_accounts SET status = 'suspended', suspended_reason = 'Akun reseller ditangguhkan oleh Administrator' WHERE reseller_id = ?`, [id]);
    } else {
      run(`UPDATE hosting_accounts SET status = 'active', suspended_reason = NULL WHERE reseller_id = ?`, [id]);
    }

    recordAuditLog(
      req.user.id,
      req.user.role,
      req.ip || '127.0.0.1',
      newStatus === 'suspended' ? 'SUSPEND_RESELLER' : 'UNSUSPEND_RESELLER',
      'user',
      String(id),
      `Reseller status set to ${newStatus} with cascade`
    );
  });

  res.json({ success: true, status: newStatus });
});

// Deposit / Adjust Reseller Balance
router.post('/:id/balance', requireRole(['admin']), (req: any, res) => {
  const id = Number(req.params.id);
  const { amount, description } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount === 0) {
    return res.status(400).json({ error: 'Jumlah saldo tidak valid' });
  }

  transaction(() => {
    run('UPDATE users SET balance = balance + ? WHERE id = ?', [numAmount, id]);
    run(
      `INSERT INTO transactions (user_id, type, amount, description, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, numAmount > 0 ? 'deposit' : 'refund', numAmount, description || 'Penyesuaian Saldo oleh Administrator', `ADJ-${Date.now()}`]
    );

    recordAuditLog(req.user.id, req.user.role, req.ip || '127.0.0.1', 'ADJUST_BALANCE', 'user', String(id), `Amount: ${numAmount}`);
  });

  const updated = queryOne<{ balance: number }>('SELECT balance FROM users WHERE id = ?', [id]);
  res.json({ success: true, balance: updated?.balance || 0 });
});

export default router;
