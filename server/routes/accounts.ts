import { Router } from 'express';
import { query, queryOne, run, transaction } from '../db/database';
import { requireRole } from '../middleware/auth';
import { provisionHostingAccount } from '../services/provisioning';
import { enqueueJob } from '../services/queue';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Accounts
router.get('/', (req: any, res) => {
  const user = req.user;
  let sql = `
    SELECT ha.*, 
           u.full_name as customer_name, u.email as customer_email,
           r.full_name as reseller_name,
           hp.name as package_name, hp.disk_mb as package_disk_mb, hp.bandwidth_mb as package_bw_mb,
           sn.name as server_name, sn.ip_address as server_ip
    FROM hosting_accounts ha
    JOIN users u ON ha.customer_id = u.id
    LEFT JOIN users r ON ha.reseller_id = r.id
    JOIN hosting_packages hp ON ha.package_id = hp.id
    JOIN server_nodes sn ON ha.server_id = sn.id
  `;

  const params: any[] = [];
  if (user.role === 'reseller') {
    sql += ` WHERE ha.reseller_id = ? `;
    params.push(user.id);
  } else if (user.role === 'customer') {
    sql += ` WHERE ha.customer_id = ? `;
    params.push(user.id);
  }

  sql += ` ORDER BY ha.id DESC`;

  const accounts = query(sql, params);
  res.json(accounts);
});

// Get Account Details
router.get('/:id', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const account = queryOne<any>(`
    SELECT ha.*, 
           u.full_name as customer_name, u.email as customer_email,
           hp.name as package_name, hp.disk_mb as package_disk_mb, hp.bandwidth_mb as package_bw_mb,
           hp.max_databases, hp.max_emails, hp.max_ftp, hp.max_cron,
           sn.name as server_name, sn.ip_address as server_ip
    FROM hosting_accounts ha
    JOIN users u ON ha.customer_id = u.id
    JOIN hosting_packages hp ON ha.package_id = hp.id
    JOIN server_nodes sn ON ha.server_id = sn.id
    WHERE ha.id = ?
  `, [id]);

  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  // Security check: customer can only view own account, reseller can only view their accounts
  if (user.role === 'customer' && account.customer_id !== user.id) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }
  if (user.role === 'reseller' && account.reseller_id !== user.id) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  // Count related resources
  const dbCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM databases WHERE hosting_account_id = ?', [id])?.c || 0;
  const emailCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM email_accounts WHERE hosting_account_id = ?', [id])?.c || 0;
  const ftpCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM ftp_accounts WHERE hosting_account_id = ?', [id])?.c || 0;
  const cronCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM cron_jobs WHERE hosting_account_id = ?', [id])?.c || 0;

  res.json({
    ...account,
    counts: {
      databases: dbCount,
      emails: emailCount,
      ftp: ftpCount,
      cron: cronCount
    }
  });
});

// Create / Provision Account (Admin, Reseller, or Customer self-service)
router.post('/', requireRole(['admin', 'reseller', 'customer']), (req: any, res) => {
  const user = req.user;
  const {
    customer_id,
    server_id,
    package_id,
    domain,
    username,
    password,
    php_version,
    install_app,
    app_title,
    admin_user,
    admin_pass
  } = req.body;

  if (!domain || !username) {
    return res.status(400).json({ error: 'Nama domain dan username cPanel wajib diisi' });
  }

  let assignedCustomerId = user.id;
  let assignedResellerId: number | null = user.reseller_id || null;

  if (user.role === 'admin') {
    assignedCustomerId = customer_id ? Number(customer_id) : user.id;
    assignedResellerId = req.body.reseller_id ? Number(req.body.reseller_id) : null;
  } else if (user.role === 'reseller') {
    assignedResellerId = user.id;
    assignedCustomerId = customer_id ? Number(customer_id) : user.id;
  } else {
    // Customer creating their own website
    assignedCustomerId = user.id;
    assignedResellerId = user.reseller_id || null;
  }

  // Pick server node
  let assignedServerId = server_id ? Number(server_id) : 1;
  const activeNode = queryOne<{ id: number }>('SELECT id FROM server_nodes WHERE status = "online" LIMIT 1');
  if (activeNode && !server_id) {
    assignedServerId = activeNode.id;
  }

  // Pick package
  let assignedPackageId = package_id ? Number(package_id) : null;
  if (!assignedPackageId) {
    const defaultPkg = queryOne<{ id: number }>('SELECT id FROM hosting_packages WHERE status = "active" LIMIT 1');
    assignedPackageId = defaultPkg ? defaultPkg.id : 1;
  }

  try {
    const result = provisionHostingAccount(
      {
        customerId: assignedCustomerId,
        resellerId: assignedResellerId,
        serverId: assignedServerId,
        packageId: assignedPackageId,
        domain,
        username,
        password: password || 'SecurePass2026!',
        phpVersion: php_version || '8.3'
      },
      user.id,
      user.role
    );

    // If WordPress or CMS installation requested on creation
    if (install_app === 'wordpress') {
      const { writeFile } = require('../services/fileManager');
      const wpConfigContent = `<?php
/**
 * Konfigurasi WordPress Otomatis (Softaculous Auto-Installer)
 * Domain: ${result.domain}
 */
define('DB_NAME', '${result.username}_db');
define('DB_USER', '${result.username}_usr');
define('DB_PASSWORD', '${password || 'SecureDbPass2026!'}');
define('DB_HOST', 'localhost');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

$table_prefix = 'wp_';
define('WP_DEBUG', false);
define('WP_SITEURL', 'https://${result.domain}');
define('WP_HOME', 'https://${result.domain}');

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}
require_once ABSPATH . 'wp-settings.php';
`;
      const indexWpContent = `<?php
/**
 * Front to the WordPress application.
 */
define('WP_USE_THEMES', true);
require __DIR__ . '/wp-blog-header.php';
`;
      const indexMockContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${app_title || result.domain} - Powered by WordPress</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center; }
    .card { max-width: 600px; margin: 40px auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    h1 { color: #38bdf8; margin-top: 0; }
    .badge { display: inline-block; padding: 4px 12px; background: #2563eb; color: #fff; border-radius: 999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .btn { display: inline-block; padding: 10px 20px; background: #22c55e; color: #000; text-decoration: none; font-weight: bold; border-radius: 8px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">WordPress 6.7 Installed</div>
    <h1>Selamat Datang di ${result.domain}</h1>
    <p>Situs WordPress Anda telah berhasil diinstal dan diprovisi melalui Softaculous 1-Click Installer.</p>
    <p style="font-size: 13px; color: #94a3b8;">Admin Username: <strong>${admin_user || 'admin'}</strong> | Database: <strong>${result.username}_db</strong></p>
    <a href="/wp-admin" class="btn">Masuk ke WP-Admin</a>
  </div>
</body>
</html>`;
      try {
        writeFile(result.id, '/public_html/wp-config.php', wpConfigContent);
        writeFile(result.id, '/public_html/index.php', indexMockContent);
      } catch (fErr) {
        console.error('Auto install WP file error:', fErr);
      }
    }

    res.status(201).json({ success: true, account: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Gagal memprovisi akun hosting' });
  }
});

// Suspend / Unsuspend
router.post('/:id/toggle-status', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { reason } = req.body;

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan' });

  if (user.role === 'reseller' && account.reseller_id !== user.id) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  const newStatus = account.status === 'active' ? 'suspended' : 'active';
  const suspReason = newStatus === 'suspended' ? (reason || 'Ditangguhkan oleh administrator') : null;

  run('UPDATE hosting_accounts SET status = ?, suspended_reason = ? WHERE id = ?', [newStatus, suspReason, id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', `${newStatus.toUpperCase()}_ACCOUNT`, 'hosting_account', String(id), `Reason: ${suspReason || 'None'}`);

  res.json({ success: true, status: newStatus });
});

// Get PHP Configuration & Options
router.get('/:id/php-config', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  let parsedExts: string[] = [];
  try {
    parsedExts = JSON.parse(account.php_extensions || '[]');
  } catch {
    parsedExts = ['curl', 'gd', 'mbstring', 'openssl', 'pdo_mysql', 'zip', 'opcache', 'ioncube', 'redis', 'imagick'];
  }

  // Read .user.ini if present or provide defaults
  const { readFile } = require('../services/fileManager');
  let userIniContent = '';
  try {
    const f = readFile(id, '/public_html/.user.ini');
    userIniContent = f.content || '';
  } catch {
    userIniContent = `; cPanel PHP Configuration for ${account.domain}
upload_max_filesize = 256M
post_max_size = 256M
memory_limit = 512M
max_execution_time = 300
max_input_time = 300
max_input_vars = 5000
allow_url_fopen = On
display_errors = Off
`;
  }

  const defaultOptions = {
    upload_max_filesize: '256M',
    post_max_size: '256M',
    memory_limit: '512M',
    max_execution_time: 300,
    max_input_time: 300,
    max_input_vars: 5000,
    allow_url_fopen: true,
    display_errors: false
  };

  res.json({
    php_version: account.php_version || '8.3',
    extensions: parsedExts,
    options: defaultOptions,
    ini_content: userIniContent,
    ioncube_loaded: parsedExts.includes('ioncube'),
    opcache_loaded: parsedExts.includes('opcache')
  });
});

// Change PHP Version
router.post('/:id/php-version', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { php_version, extensions, options, ini_content } = req.body;

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  const extJson = extensions ? JSON.stringify(extensions) : account.php_extensions;

  run('UPDATE hosting_accounts SET php_version = ?, php_extensions = ? WHERE id = ?', [php_version || '8.3', extJson, id]);

  // Generate / Write .user.ini in /public_html
  const { writeFile } = require('../services/fileManager');
  let finalIni = ini_content;
  if (!finalIni && options) {
    finalIni = `; cPanel PHP INI Options for ${account.domain}
upload_max_filesize = ${options.upload_max_filesize || '256M'}
post_max_size = ${options.post_max_size || '256M'}
memory_limit = ${options.memory_limit || '512M'}
max_execution_time = ${options.max_execution_time || 300}
max_input_time = ${options.max_input_time || 300}
max_input_vars = ${options.max_input_vars || 5000}
allow_url_fopen = ${options.allow_url_fopen ? 'On' : 'Off'}
display_errors = ${options.display_errors ? 'On' : 'Off'}
`;
  }

  if (finalIni) {
    try {
      writeFile(id, '/public_html/.user.ini', finalIni);
    } catch (e) {
      console.error('Failed to write .user.ini:', e);
    }
  }

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CHANGE_PHP_VERSION', 'hosting_account', String(id), `PHP Version: ${php_version}, ionCube: ${extensions?.includes('ioncube') ? 'Yes' : 'No'}`);

  res.json({
    success: true,
    php_version: php_version || '8.3',
    extensions: JSON.parse(extJson),
    options: options || {},
    ioncube_loaded: extensions?.includes('ioncube')
  });
});

// Reissue Auto-SSL
router.post('/:id/reissue-ssl', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan' });

  run(`UPDATE hosting_accounts SET ssl_status = 'active', ssl_expires_at = datetime('now', '+90 days') WHERE id = ?`, [id]);
  enqueueJob('GENERATE_AUTO_SSL', { domain: account.domain, account_id: id });

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'REISSUE_SSL', 'hosting_account', String(id), `SSL renewed for ${account.domain}`);

  res.json({
    success: true,
    ssl_status: 'active',
    ssl_issuer: "Let's Encrypt Authority X3",
    ssl_expires_at: new Date(Date.now() + 90 * 86400000).toISOString()
  });
});

// Delete Account
router.delete('/:id', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan' });

  if (user.role === 'reseller' && account.reseller_id !== user.id) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  transaction(() => {
    // Delete account (cascading deletes handles zones, databases, emails, etc.)
    run('DELETE FROM hosting_accounts WHERE id = ?', [id]);
    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'TERMINATE_ACCOUNT', 'hosting_account', String(id), `Domain: ${account.domain}`);
  });

  res.json({ success: true, message: `Akun untuk domain ${account.domain} berhasil dihapus.` });
});

// WHM: Change / Upgrade Hosting Package
router.post('/:id/change-package', requireRole(['admin', 'reseller']), (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { package_id } = req.body;

  if (!package_id) return res.status(400).json({ error: 'Paket hosting baru wajib dipilih' });

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan' });

  if (user.role === 'reseller' && account.reseller_id !== user.id) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  const pkg = queryOne<any>('SELECT * FROM hosting_packages WHERE id = ?', [Number(package_id)]);
  if (!pkg) return res.status(400).json({ error: 'Paket tujuan tidak ditemukan' });

  run('UPDATE hosting_accounts SET package_id = ? WHERE id = ?', [pkg.id, id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'UPGRADE_PACKAGE', 'hosting_account', String(id), `Upgraded to ${pkg.name} (${pkg.disk_mb}MB disk)`);

  res.json({ success: true, message: `Paket berhasil diubah menjadi ${pkg.name}.`, package: pkg });
});

// WHM & cPanel: Reset Account Password
router.post('/:id/reset-password', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
  }

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  const bcrypt = require('bcryptjs');
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(new_password, salt);

  run('UPDATE hosting_accounts SET password_hash = ? WHERE id = ?', [hash, id]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'RESET_PASSWORD', 'hosting_account', String(id), `Password updated for ${account.domain}`);

  res.json({ success: true, message: `Password akun cPanel untuk ${account.domain} berhasil diperbarui.` });
});

// cPanel: Softaculous 1-Click App Installer
router.post('/:id/install-app', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { app_id, site_title, admin_username, admin_password, admin_email } = req.body;

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  const { writeFile } = require('../services/fileManager');

  const appName = app_id === 'laravel' ? 'Laravel 11 Framework' : (app_id === 'joomla' ? 'Joomla 5 CMS' : 'WordPress 6.7');

  if (app_id === 'wordpress') {
    const wpIndex = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site_title || 'Website WordPress'} - ${account.domain}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #f1f5f9; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
    .box { max-width: 650px; background: #131d31; border: 1px solid #1e293b; border-radius: 18px; padding: 36px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    h1 { color: #38bdf8; font-size: 26px; margin: 12px 0; }
    .tag { display: inline-block; background: #2563eb; color: #fff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .meta { background: #0b1120; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: left; font-family: monospace; font-size: 13px; color: #cbd5e1; }
    .meta-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1e293b; }
    .meta-row:last-child { border-bottom: none; }
    .meta-key { color: #64748b; }
    .btn { display: inline-block; background: #0284c7; hover: #0369a1; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; transition: 0.2s; }
  </style>
</head>
<body>
  <div class="box">
    <span class="tag">Softaculous Auto-Installed</span>
    <h1>${site_title || 'Website WordPress Siap Digunakan'}</h1>
    <p>Selamat! CMS WordPress telah berhasil diinstal pada direktori <code>/public_html</code> domain <strong>${account.domain}</strong> dengan sertifikat SSL aktif.</p>
    <div class="meta">
      <div class="meta-row"><span class="meta-key">URL Situs:</span><span>https://${account.domain}</span></div>
      <div class="meta-row"><span class="meta-key">WP Admin:</span><span>https://${account.domain}/wp-admin</span></div>
      <div class="meta-row"><span class="meta-key">Administrator:</span><span>${admin_username || 'admin'}</span></div>
      <div class="meta-row"><span class="meta-key">Database MySQL:</span><span>${account.username}_db</span></div>
      <div class="meta-row"><span class="meta-key">PHP Engine:</span><span>PHP ${account.php_version} (OPcache active)</span></div>
    </div>
    <a href="/wp-admin" class="btn">Buka Panel Admin WordPress</a>
  </div>
</body>
</html>`;

    writeFile(id, '/public_html/index.php', wpIndex);
    writeFile(id, '/public_html/wp-config.php', `<?php\n// WordPress Softaculous Auto Config\ndefine('DB_NAME', '${account.username}_db');\ndefine('DB_USER', '${account.username}_usr');\ndefine('DB_PASSWORD', 'SecurePass2026!');\ndefine('DB_HOST', 'localhost');\n$table_prefix = 'wp_';\ndefine('WP_DEBUG', false);\n`);
  } else {
    const genericIndex = `<!DOCTYPE html>
<html>
<head><title>${site_title || appName} - ${account.domain}</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #fff;">
  <h1>${appName} Berhasil Diinstal!</h1>
  <p>Aplikasi telah siap dijalankan di https://${account.domain}</p>
</body>
</html>`;
    writeFile(id, '/public_html/index.php', genericIndex);
  }

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'INSTALL_APP', 'hosting_account', String(id), `Installed ${appName} on ${account.domain}`);

  res.json({
    success: true,
    message: `${appName} berhasil diinstal di ${account.domain}!`,
    details: {
      app: appName,
      domain: account.domain,
      admin_url: `https://${account.domain}/wp-admin`,
      admin_user: admin_username || 'admin',
      database: `${account.username}_db`
    }
  });
});

// cPanel: Web Terminal SSH Simulator
router.post('/:id/terminal', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { command } = req.body;

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  const cmd = (command || '').trim();
  const lower = cmd.toLowerCase();

  let output = '';

  if (lower === 'ls' || lower === 'ls -la' || lower === 'll') {
    output = `total 36
drwxr-xr-x 6 ${account.username} ${account.username} 4096 Sep 28 23:30 .
drwxr-xr-x 4 root              root              4096 Sep 28 23:00 ..
-rw-r--r-- 1 ${account.username} ${account.username}  220 Sep 28 23:00 .bash_logout
-rw-r--r-- 1 ${account.username} ${account.username} 3771 Sep 28 23:00 .bashrc
drwx------ 2 ${account.username} ${account.username} 4096 Sep 28 23:00 .ssh
drwxr-xr-x 3 ${account.username} ${account.username} 4096 Sep 28 23:15 etc
drwxr-xr-x 4 ${account.username} ${account.username} 4096 Sep 28 23:30 mail
drwxr-xr-x 5 ${account.username} ${account.username} 4096 Sep 28 23:35 public_html
drwxr-xr-x 2 ${account.username} ${account.username} 4096 Sep 28 23:00 ssl`;
  } else if (lower.startsWith('php -v')) {
    output = `PHP ${account.php_version}.14 (cli) (built: Sep 2026 12:44:02) (NTS)
Copyright (c) The PHP Group
Zend Engine v4.3.14, Copyright (c) Zend Technologies
    with Zend OPcache v4.3.14, Copyright (c), by Zend Technologies`;
  } else if (lower.startsWith('wp core version') || lower.startsWith('wp --info') || lower === 'wp') {
    output = `OS: Linux 6.8.0-40-generic x86_64
Shell: /bin/bash
PHP binary: /usr/bin/php${account.php_version}
PHP version: ${account.php_version}
php.ini used: /etc/php/${account.php_version}/fpm/php.ini
WP-CLI root dir: phar://wp-cli.phar/vendor/wp-cli/wp-cli
WP-CLI version: 2.11.0`;
  } else if (lower === 'pwd') {
    output = `/home/${account.username}`;
  } else if (lower === 'whoami') {
    output = account.username;
  } else if (lower.startsWith('df -h') || lower === 'df') {
    output = `Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1p2  950G  240G  710G  26% /
/dev/loop0       50G  4.2G   46G   9% /home/${account.username}`;
  } else if (lower.startsWith('cat') && lower.includes('.htaccess')) {
    output = `# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress`;
  } else if (lower.startsWith('composer')) {
    output = `Composer version 2.7.9 2026-08-15 14:32:00
PHP version ${account.php_version} (/usr/bin/php${account.php_version})`;
  } else if (lower === 'uptime') {
    output = ` 23:35:10 up 45 days, 14:12,  1 user,  load average: 0.18, 0.22, 0.19`;
  } else if (lower === 'clear') {
    output = '';
  } else {
    output = `bash: ${cmd}: command executed successfully (virtualhost sandbox environment for ${account.domain})`;
  }

  res.json({ output });
});

// cPanel: Error Logs Viewer
router.get('/:id/logs', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  const now = new Date();
  const logs = [
    {
      timestamp: new Date(now.getTime() - 120000).toISOString(),
      level: 'INFO',
      client: '182.253.14.88',
      message: `[ssl:notice] [pid 14202:tid 139] AH01914: Configuring server for SSL handshake on ${account.domain}:443`
    },
    {
      timestamp: new Date(now.getTime() - 95000).toISOString(),
      level: 'NOTICE',
      client: '114.124.200.12',
      message: `[php:notice] PHP Notice: session_start(): A session had already been started in /home/${account.username}/public_html/index.php line 4`
    },
    {
      timestamp: new Date(now.getTime() - 45000).toISOString(),
      level: 'INFO',
      client: '36.84.101.45',
      message: `[core:info] [pid 14205] Access: GET / HTTP/2.0 200 4820 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"`
    },
    {
      timestamp: new Date(now.getTime() - 15000).toISOString(),
      level: 'INFO',
      client: '103.145.226.10',
      message: `[autossl:success] Let's Encrypt Certificate validation passed for *.${account.domain} and ${account.domain}`
    }
  ];

  res.json({ domain: account.domain, logs });
});

// cPanel: Subdomains Manager
router.get('/:id/subdomains', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  // Get zone
  const zone = queryOne<any>('SELECT id FROM dns_zones WHERE hosting_account_id = ?', [id]);
  if (!zone) return res.json([]);

  const records = query<any>(`
    SELECT * FROM dns_records 
    WHERE zone_id = ? AND type IN ('A', 'CNAME') AND name NOT IN ('@', 'www', 'mail')
  `, [zone.id]);

  const subdomains = records.map((r) => ({
    id: r.id,
    subdomain: `${r.name}.${account.domain}`,
    name: r.name,
    root: `/public_html/${r.name}`,
    target: r.content,
    php_version: account.php_version,
    created_at: r.created_at
  }));

  res.json(subdomains);
});

// cPanel: Create Subdomain
router.post('/:id/subdomains', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { subdomain_name } = req.body;

  if (!subdomain_name) return res.status(400).json({ error: 'Nama subdomain wajib diisi (misal: blog)' });

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  const cleanName = subdomain_name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  let zone = queryOne<any>('SELECT id FROM dns_zones WHERE hosting_account_id = ?', [id]);
  if (!zone) {
    const zResult = run('INSERT INTO dns_zones (hosting_account_id, domain) VALUES (?, ?)', [id, account.domain]);
    zone = { id: zResult.lastInsertRowid };
  }

  // Find server IP
  const server = queryOne<{ ip_address: string }>('SELECT ip_address FROM server_nodes WHERE id = ?', [account.server_id]);
  const serverIp = server?.ip_address || '103.145.226.10';

  const insertRec = run(
    `INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'A', ?, ?, 3600)`,
    [zone.id, cleanName, serverIp]
  );

  // Create folder via fileManager service
  const { createDirectory, writeFile } = require('../services/fileManager');
  try {
    createDirectory(id, `/public_html/${cleanName}`);
    writeFile(id, `/public_html/${cleanName}/index.html`, `<h1>Subdomain ${cleanName}.${account.domain} Aktif</h1>`);
  } catch (dirErr) {
    console.error('Subdomain folder creation notice:', dirErr);
  }

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_SUBDOMAIN', 'dns_record', String(insertRec.lastInsertRowid), `Created ${cleanName}.${account.domain}`);

  res.status(201).json({
    success: true,
    subdomain: {
      id: insertRec.lastInsertRowid,
      subdomain: `${cleanName}.${account.domain}`,
      name: cleanName,
      root: `/public_html/${cleanName}`,
      target: serverIp,
      php_version: account.php_version
    }
  });
});

// cPanel: Delete Subdomain
router.delete('/:id/subdomains/:recordId', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const recordId = Number(req.params.recordId);

  const account = queryOne<any>('SELECT * FROM hosting_accounts WHERE id = ?', [id]);
  if (!account) return res.status(404).json({ error: 'Akun hosting tidak ditemukan' });

  if (user.role === 'customer' && account.customer_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });
  if (user.role === 'reseller' && account.reseller_id !== user.id) return res.status(403).json({ error: 'Akses ditolak' });

  run('DELETE FROM dns_records WHERE id = ?', [recordId]);
  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DELETE_SUBDOMAIN', 'dns_record', String(recordId), `Removed subdomain on ${account.domain}`);

  res.json({ success: true, message: 'Subdomain berhasil dihapus.' });
});

export default router;
