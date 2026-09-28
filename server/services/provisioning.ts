import bcrypt from 'bcryptjs';
import { query, queryOne, run, transaction } from '../db/database';
import { enqueueJob } from './queue';
import { recordAuditLog } from '../middleware/audit';

export interface ProvisionRequest {
  customerId: number;
  resellerId?: number | null;
  serverId: number;
  packageId: number;
  domain: string;
  username: string;
  password?: string;
  phpVersion?: string;
}

export function provisionHostingAccount(req: ProvisionRequest, actorUserId: number, actorRole: string) {
  // 1. Validation
  const cleanDomain = req.domain.trim().toLowerCase().replace(/^https?:\/\//, '');
  const cleanUsername = req.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const existing = queryOne('SELECT id FROM hosting_accounts WHERE domain = ? OR username = ?', [cleanDomain, cleanUsername]);
  if (existing) {
    throw new Error(`Domain atau username '${cleanDomain}' / '${cleanUsername}' sudah terdaftar di sistem.`);
  }

  // 2. Validate package and limits
  const pkg = queryOne('SELECT * FROM hosting_packages WHERE id = ?', [req.packageId]);
  if (!pkg) {
    throw new Error('Paket hosting tidak ditemukan.');
  }

  // 3. If reseller actor, check limits
  if (actorRole === 'reseller' || req.resellerId) {
    const resId = req.resellerId || actorUserId;
    const accountCount = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM hosting_accounts WHERE reseller_id = ?',
      [resId]
    )?.count || 0;

    // Reseller max accounts check (default 50)
    if (accountCount >= 50) {
      throw new Error('Batas maksimum akun hosting untuk paket reseller ini telah tercapai (50 Akun). Silakan upgrade paket.');
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(req.password || 'SecureHost2026!', salt);

  // 4. Atomic transaction
  return transaction(() => {
    // Insert hosting account
    const accountResult = run(
      `INSERT INTO hosting_accounts 
       (customer_id, reseller_id, server_id, package_id, domain, username, password_hash, status, disk_used_mb, bandwidth_used_mb, php_version, ssl_status, auto_ssl, force_https)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 45, 120, ?, 'active', 1, 1)`,
      [
        req.customerId,
        req.resellerId || null,
        req.serverId,
        req.packageId,
        cleanDomain,
        cleanUsername,
        passwordHash,
        req.phpVersion || '8.3'
      ]
    );

    const accountId = accountResult.lastInsertRowid;

    // Create DNS Zone
    const zoneResult = run(`INSERT INTO dns_zones (hosting_account_id, domain) VALUES (?, ?)`, [accountId, cleanDomain]);
    const zoneId = zoneResult.lastInsertRowid;

    // Find server IP
    const server = queryOne<{ ip_address: string }>('SELECT ip_address FROM server_nodes WHERE id = ?', [req.serverId]);
    const serverIp = server?.ip_address || '103.145.226.10';

    // Populate standard DNS records
    run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'A', '@', ?, 3600)`, [zoneId, serverIp]);
    run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'CNAME', 'www', ?, 3600)`, [zoneId, cleanDomain]);
    run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'A', 'mail', ?, 3600)`, [zoneId, serverIp]);
    run(`INSERT INTO dns_records (zone_id, type, name, content, ttl, priority) VALUES (?, 'MX', '@', ?, 3600, 10)`, [zoneId, `mail.${cleanDomain}`]);
    run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'TXT', '@', ?, 3600)`, [zoneId, `v=spf1 a mx ip4:${serverIp} ~all`]);
    run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'NS', '@', 'ns1.cloudpro.id', 86400)`, [zoneId]);
    run(`INSERT INTO dns_records (zone_id, type, name, content, ttl) VALUES (?, 'NS', '@', 'ns2.cloudpro.id', 86400)`, [zoneId]);

    // Create default email account
    run(
      `INSERT INTO email_accounts (hosting_account_id, email, quota_mb, used_mb)
       VALUES (?, ?, 1024, 0)`,
      [accountId, `webmaster@${cleanDomain}`]
    );

    // Create default database
    run(
      `INSERT INTO databases (hosting_account_id, db_name, db_user, charset, size_mb)
       VALUES (?, ?, ?, 'utf8mb4', 0.5)`,
      [accountId, `${cleanUsername}_db`, `${cleanUsername}_usr`]
    );

    // Create default FTP account
    run(
      `INSERT INTO ftp_accounts (hosting_account_id, username, directory, quota_mb)
       VALUES (?, ?, '/public_html', ?)`,
      [accountId, `${cleanUsername}_ftp`, pkg.disk_mb]
    );

    // Create invoice for new account
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tax = Math.round(pkg.price_monthly * 0.11);
    const total = pkg.price_monthly + tax;

    run(
      `INSERT INTO invoices (invoice_number, user_id, reseller_id, hosting_account_id, package_id, amount, tax, total_amount, status, payment_method, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'balance', datetime('now', '+30 days'))`,
      [invNumber, req.customerId, req.resellerId || null, accountId, req.packageId, pkg.price_monthly, tax, total]
    );

    // Enqueue SSL & DNS jobs
    enqueueJob('GENERATE_AUTO_SSL', { domain: cleanDomain, account_id: accountId });
    enqueueJob('SYNC_DNS_ZONE', { domain: cleanDomain, zone_id: zoneId });

    // Notification
    run(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, 'Hosting Aktif', ?, 'success', '/accounts')`,
      [req.customerId, `Akun hosting untuk domain ${cleanDomain} berhasil diprovisi dan siap digunakan.`]
    );

    // Audit Log
    recordAuditLog(
      actorUserId,
      actorRole,
      '127.0.0.1',
      'PROVISION_ACCOUNT',
      'hosting_account',
      String(accountId),
      `Domain: ${cleanDomain}, Username: ${cleanUsername}, Package: ${pkg.name}`
    );

    return {
      id: accountId,
      domain: cleanDomain,
      username: cleanUsername,
      package: pkg.name,
      serverIp,
      sslStatus: 'active'
    };
  });
}
