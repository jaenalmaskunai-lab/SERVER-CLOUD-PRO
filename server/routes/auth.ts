import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../db/database';
import { generateToken, AuthUser } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan kata sandi wajib diisi' });
  }

  const user = queryOne<any>(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username.trim(), username.trim()]
  );

  if (!user) {
    return res.status(401).json({ error: 'Kredensial tidak valid' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid && password !== 'Cloudpro123!') { // Allow master demo password
    return res.status(401).json({ error: 'Kredensial tidak valid' });
  }

  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    reseller_id: user.reseller_id,
    full_name: user.full_name,
    company: user.company,
    balance: user.balance
  };

  const token = generateToken(authUser);

  // Get reseller branding if user belongs to a reseller
  let whiteLabel = null;
  const resellerIdToLookup = user.role === 'reseller' ? user.id : user.reseller_id;
  if (resellerIdToLookup) {
    whiteLabel = queryOne('SELECT * FROM reseller_settings WHERE user_id = ?', [resellerIdToLookup]);
  }

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'USER_LOGIN', 'user', String(user.id), `Login berhasil sebagai ${user.role}`);

  res.json({
    token,
    user: authUser,
    whiteLabel
  });
});

// Quick Switch Role (for testing and evaluation convenience)
router.post('/switch-role', (req, res) => {
  const { targetRole, userId } = req.body;

  let targetUser: any = null;
  if (userId) {
    targetUser = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  } else if (targetRole) {
    targetUser = queryOne('SELECT * FROM users WHERE role = ? LIMIT 1', [targetRole]);
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'Pengguna target tidak ditemukan' });
  }

  const authUser: AuthUser = {
    id: targetUser.id,
    username: targetUser.username,
    email: targetUser.email,
    role: targetUser.role,
    reseller_id: targetUser.reseller_id,
    full_name: targetUser.full_name,
    company: targetUser.company,
    balance: targetUser.balance
  };

  const token = generateToken(authUser);
  const resellerIdToLookup = targetUser.role === 'reseller' ? targetUser.id : targetUser.reseller_id;
  const whiteLabel = resellerIdToLookup ? queryOne('SELECT * FROM reseller_settings WHERE user_id = ?', [resellerIdToLookup]) : null;

  res.json({
    token,
    user: authUser,
    whiteLabel
  });
});

// Current User Profile
router.get('/me', (req: any, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });

  const freshUser = queryOne<any>('SELECT * FROM users WHERE id = ?', [user.id]);
  const resellerIdToLookup = freshUser.role === 'reseller' ? freshUser.id : freshUser.reseller_id;
  const whiteLabel = resellerIdToLookup ? queryOne('SELECT * FROM reseller_settings WHERE user_id = ?', [resellerIdToLookup]) : null;

  res.json({
    user: {
      id: freshUser.id,
      username: freshUser.username,
      email: freshUser.email,
      role: freshUser.role,
      reseller_id: freshUser.reseller_id,
      full_name: freshUser.full_name,
      phone: freshUser.phone,
      company: freshUser.company,
      balance: freshUser.balance,
      two_factor_enabled: Boolean(freshUser.two_factor_enabled)
    },
    whiteLabel
  });
});

// Toggle 2FA
router.post('/toggle-2fa', (req: any, res) => {
  const user = req.user;
  const current = queryOne<{ two_factor_enabled: number }>('SELECT two_factor_enabled FROM users WHERE id = ?', [user.id]);
  const newStatus = current?.two_factor_enabled ? 0 : 1;

  run('UPDATE users SET two_factor_enabled = ? WHERE id = ?', [newStatus, user.id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'TOGGLE_2FA', 'user', String(user.id), `2FA status set to ${newStatus}`);

  res.json({ success: true, two_factor_enabled: Boolean(newStatus) });
});

// List Available Demo Personas
router.get('/personas', (req, res) => {
  const users = query(`
    SELECT u.id, u.username, u.email, u.role, u.full_name, u.company, u.balance, rs.brand_name
    FROM users u
    LEFT JOIN reseller_settings rs ON u.id = rs.user_id
    WHERE u.status = 'active'
    ORDER BY u.id ASC
  `);
  res.json(users);
});

export default router;
