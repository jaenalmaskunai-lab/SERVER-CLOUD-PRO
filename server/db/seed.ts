import bcrypt from 'bcryptjs';
import { Database as SqlJsDatabase } from 'sql.js';

export async function seedInitialData(db: SqlJsDatabase) {
  console.log('[Seed] Seeding initial Cloud PRO relational hosting data...');

  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('Cloudpro123!', salt);

  // 1. Insert Users
  // Root Admin
  db.run(`
    INSERT INTO users (id, username, email, password_hash, role, reseller_id, full_name, phone, company, status, balance, two_factor_enabled)
    VALUES (1, 'admin', 'admin@cloudpro.id', ?, 'admin', NULL, 'Master Administrator', '+6281122334455', 'Cloud PRO Infrastructure Ltd', 'active', 50000000.0, 1)
  `, [defaultPasswordHash]);

  // Resellers
  db.run(`
    INSERT INTO users (id, username, email, password_hash, role, reseller_id, full_name, phone, company, status, balance, two_factor_enabled)
    VALUES 
    (2, 'reseller_nusantara', 'billing@nusantaracloud.com', ?, 'reseller', NULL, 'Hendra Wijaya', '+6281234567890', 'PT Nusantara Cloud Solutions', 'active', 12500000.0, 1),
    (3, 'reseller_javahost', 'support@javahost.co.id', ?, 'reseller', NULL, 'Rian Pratama', '+6281987654321', 'JavaHost Media Network', 'active', 4200000.0, 0)
  `, [defaultPasswordHash, defaultPasswordHash]);

  // Customers
  db.run(`
    INSERT INTO users (id, username, email, password_hash, role, reseller_id, full_name, phone, company, status, balance, two_factor_enabled)
    VALUES 
    (4, 'ahmad_dev', 'ahmad@tokobajuonline.com', ?, 'customer', 2, 'Ahmad Fauzi', '+6285211223344', 'Toko Baju Online Store', 'active', 150000.0, 0),
    (5, 'budi_solusi', 'budi@ptsolusidigital.co.id', ?, 'customer', 2, 'Budi Santoso', '+6287812345678', 'PT Solusi Digital Perkasa', 'active', 500000.0, 1),
    (6, 'siti_klinik', 'siti@kliniksehat.id', ?, 'customer', 3, 'Dr. Siti Rahma', '+6281398761234', 'Klinik Medika Sehat', 'active', 80000.0, 0),
    (7, 'dewi_kreatif', 'dewi@agensikreatif.com', ?, 'customer', NULL, 'Dewi Lestari', '+6282144556677', 'Studio Agensi Kreatif', 'active', 320000.0, 0)
  `, [defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash]);

  // 2. Reseller Settings (White Label)
  db.run(`
    INSERT INTO reseller_settings (user_id, brand_name, logo_url, favicon_url, accent_color, custom_domain, support_email, invoice_footer)
    VALUES 
    (2, 'Nusantara Cloud', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80', '', '#2563eb', 'panel.nusantaracloud.com', 'support@nusantaracloud.com', 'Terima kasih telah memilih PT Nusantara Cloud Solutions sebagai partner hosting Anda.'),
    (3, 'JavaHost Enterprise', '', '', '#059669', 'cp.javahost.co.id', 'helpdesk@javahost.co.id', 'Layanan Hosting Cepat & Andal dari JavaHost.')
  `);

  // 3. Server Nodes
  db.run(`
    INSERT INTO server_nodes (id, name, hostname, ip_address, secondary_ips, location, os, total_cpu_cores, total_ram_mb, total_disk_gb, status, is_default)
    VALUES 
    (1, 'Node ID-JKT-01 (Cyber 1 DC)', 'srv-jkt01.cloudpro.id', '103.145.226.10', '["103.145.226.11","103.145.226.12"]', 'Jakarta, Indonesia', 'Ubuntu 24.04 LTS (Noble)', 16, 65536, 2048, 'online', 1),
    (2, 'Node SG-SIN-01 (Telin DC)', 'srv-sg01.cloudpro.id', '139.180.208.45', '["139.180.208.46"]', 'Jurong, Singapore', 'Ubuntu 24.04 LTS (Noble)', 8, 32768, 1024, 'online', 0),
    (3, 'Node US-SJC-01 (Equinix SV1)', 'srv-us01.cloudpro.id', '104.248.160.12', '["104.248.160.13"]', 'San Jose, USA', 'Ubuntu 22.04 LTS (Jammy)', 16, 65536, 2048, 'online', 0)
  `);

  // 4. Hosting Packages
  db.run(`
    INSERT INTO hosting_packages (id, name, slug, reseller_id, disk_mb, bandwidth_mb, cpu_percent, ram_mb, max_domains, max_subdomains, max_databases, max_emails, max_ftp, max_cron, allow_ssl, allow_backup, price_monthly, price_annual, status)
    VALUES 
    (1, 'Starter Lite Cloud', 'starter-lite', NULL, 5120, 51200, 100, 1024, 1, 5, 3, 5, 2, 3, 1, 1, 35000, 350000, 'active'),
    (2, 'Business Pro NVMe', 'business-pro', NULL, 20480, 204800, 200, 2048, 5, 20, 10, 20, 5, 10, 1, 1, 85000, 850000, 'active'),
    (3, 'Enterprise Ultra', 'enterprise-ultra', NULL, 51200, 512000, 400, 4096, 15, 50, 25, 50, 10, 20, 1, 1, 175000, 1750000, 'active'),
    (4, 'Reseller Master 50', 'reseller-master-50', NULL, 102400, 1024000, 800, 8192, 50, 150, 50, 150, 25, 50, 1, 1, 450000, 4500000, 'active'),
    (5, 'Paket UMKM Juara', 'paket-umkm-juara', 2, 3072, 30720, 100, 1024, 1, 3, 2, 3, 1, 2, 1, 1, 25000, 250000, 'active'),
    (6, 'Paket Toko Online Pro', 'paket-toko-online-pro', 2, 15360, 153600, 200, 2048, 3, 10, 5, 15, 3, 5, 1, 1, 75000, 750000, 'active')
  `);

  // 5. Hosting Accounts
  db.run(`
    INSERT INTO hosting_accounts (id, customer_id, reseller_id, server_id, package_id, domain, username, password_hash, status, disk_used_mb, bandwidth_used_mb, php_version, ssl_status, ssl_issuer, ssl_expires_at, auto_ssl, force_https)
    VALUES 
    (1, 4, 2, 1, 5, 'tokobajuonline.com', 'tokobaju', ?, 'active', 780, 8450, '8.2', 'active', 'Let''s Encrypt Authority X3', datetime('now', '+82 days'), 1, 1),
    (2, 5, 2, 1, 2, 'ptsolusidigital.co.id', 'solusidg', ?, 'active', 2850, 24100, '8.3', 'active', 'Let''s Encrypt Authority X3', datetime('now', '+64 days'), 1, 1),
    (3, 6, 3, 1, 5, 'kliniksehat.id', 'kliniksehat', ?, 'active', 540, 4320, '8.1', 'active', 'Let''s Encrypt Authority X3', datetime('now', '+45 days'), 1, 1),
    (4, 7, NULL, 2, 2, 'agensikreatif.com', 'agensikreatif', ?, 'active', 1890, 14200, '8.3', 'active', 'Let''s Encrypt Authority X3', datetime('now', '+89 days'), 1, 1)
  `, [defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash]);

  // 6. DNS Zones & Records
  db.run(`
    INSERT INTO dns_zones (id, hosting_account_id, domain)
    VALUES 
    (1, 1, 'tokobajuonline.com'),
    (2, 2, 'ptsolusidigital.co.id'),
    (3, 3, 'kliniksehat.id'),
    (4, 4, 'agensikreatif.com')
  `);

  db.run(`
    INSERT INTO dns_records (zone_id, type, name, content, ttl, priority)
    VALUES 
    (1, 'A', '@', '103.145.226.10', 3600, NULL),
    (1, 'CNAME', 'www', 'tokobajuonline.com', 3600, NULL),
    (1, 'A', 'mail', '103.145.226.10', 3600, NULL),
    (1, 'MX', '@', 'mail.tokobajuonline.com', 3600, 10),
    (1, 'TXT', '@', 'v=spf1 a mx ip4:103.145.226.10 ~all', 3600, NULL),
    (1, 'NS', '@', 'ns1.cloudpro.id', 86400, NULL),
    (1, 'NS', '@', 'ns2.cloudpro.id', 86400, NULL),
    (2, 'A', '@', '103.145.226.10', 3600, NULL),
    (2, 'CNAME', 'www', 'ptsolusidigital.co.id', 3600, NULL),
    (2, 'MX', '@', 'mail.ptsolusidigital.co.id', 3600, 10),
    (2, 'TXT', '@', 'v=spf1 a mx ~all', 3600, NULL),
    (3, 'A', '@', '103.145.226.10', 3600, NULL),
    (3, 'CNAME', 'www', 'kliniksehat.id', 3600, NULL),
    (4, 'A', '@', '139.180.208.45', 3600, NULL),
    (4, 'CNAME', 'www', 'agensikreatif.com', 3600, NULL)
  `);

  // 7. Databases
  db.run(`
    INSERT INTO databases (hosting_account_id, db_name, db_user, charset, size_mb)
    VALUES 
    (1, 'tokobaju_wp', 'tokobaju_u1', 'utf8mb4', 38.4),
    (1, 'tokobaju_shop', 'tokobaju_u2', 'utf8mb4', 14.2),
    (2, 'solusidg_crm', 'solusidg_app', 'utf8mb4', 124.6),
    (3, 'klinik_antrean', 'klinik_admin', 'utf8mb4', 8.9),
    (4, 'agensi_portfolio', 'agensi_db', 'utf8mb4', 45.1)
  `);

  // 8. Email Accounts
  db.run(`
    INSERT INTO email_accounts (hosting_account_id, email, quota_mb, used_mb, forward_to)
    VALUES 
    (1, 'admin@tokobajuonline.com', 1024, 85.4, 'ahmad@gmail.com'),
    (1, 'sales@tokobajuonline.com', 2048, 312.0, ''),
    (2, 'info@ptsolusidigital.co.id', 2048, 145.8, ''),
    (3, 'dokter@kliniksehat.id', 1024, 42.0, ''),
    (4, 'halo@agensikreatif.com', 2048, 210.5, '')
  `);

  // 9. FTP Accounts
  db.run(`
    INSERT INTO ftp_accounts (hosting_account_id, username, directory, quota_mb, status)
    VALUES 
    (1, 'tokobaju_ftp', '/public_html', 3072, 'active'),
    (2, 'solusidg_deploy', '/public_html', 10240, 'active')
  `);

  // 10. Cron Jobs
  db.run(`
    INSERT INTO cron_jobs (hosting_account_id, command, minute, hour, day, month, weekday, is_active, last_run)
    VALUES 
    (1, '/usr/local/bin/php /home/tokobaju/public_html/wp-cron.php >/dev/null 2>&1', '*/15', '*', '*', '*', '*', 1, datetime('now', '-5 minutes')),
    (2, '/usr/local/bin/php /home/solusidg/public_html/artisan schedule:run >/dev/null 2>&1', '*', '*', '*', '*', '*', 1, datetime('now', '-1 minutes'))
  `);

  // 11. Backups
  db.run(`
    INSERT INTO backups (hosting_account_id, type, file_name, file_size_mb, storage_type, status, created_at)
    VALUES 
    (1, 'full', 'backup_tokobajuonline.com_2026-09-27_full.tar.gz', 285.4, 'local', 'completed', datetime('now', '-1 day')),
    (1, 'database', 'backup_tokobaju_wp_2026-09-28.sql.gz', 12.3, 'local', 'completed', datetime('now', '-2 hours')),
    (2, 'full', 'backup_ptsolusidigital.co.id_2026-09-26_full.tar.gz', 740.1, 'remote', 'completed', datetime('now', '-2 days'))
  `);

  // 12. Invoices
  db.run(`
    INSERT INTO invoices (invoice_number, user_id, reseller_id, hosting_account_id, package_id, amount, tax, total_amount, status, payment_method, paid_at, due_date)
    VALUES 
    ('INV-2026-0012', 4, 2, 1, 5, 25000, 2750, 27750, 'paid', 'qris', datetime('now', '-20 days'), datetime('now', '-18 days')),
    ('INV-2026-0015', 5, 2, 2, 2, 85000, 9350, 94350, 'paid', 'bank_transfer', datetime('now', '-15 days'), datetime('now', '-12 days')),
    ('INV-2026-0028', 2, NULL, NULL, 4, 450000, 49500, 499500, 'paid', 'credit_card', datetime('now', '-5 days'), datetime('now', '-3 days')),
    ('INV-2026-0041', 4, 2, 1, 5, 25000, 2750, 27750, 'unpaid', 'qris', NULL, datetime('now', '+10 days'))
  `);

  // 13. Transactions
  db.run(`
    INSERT INTO transactions (user_id, type, amount, description, reference_id)
    VALUES 
    (2, 'deposit', 5000000, 'Top-up saldo reseller via Virtual Account BCA', 'VA-BCA-9812401'),
    (2, 'purchase', -499500, 'Pembayaran Perpanjangan Paket Reseller Master 50 (INV-2026-0028)', 'INV-2026-0028'),
    (4, 'purchase', -27750, 'Pembayaran Paket UMKM Juara tokobajuonline.com (INV-2026-0012)', 'INV-2026-0012')
  `);

  // 14. Audit Logs
  db.run(`
    INSERT INTO audit_logs (user_id, user_role, ip_address, action, entity_type, entity_id, details)
    VALUES 
    (1, 'admin', '180.252.12.8', 'SYSTEM_INIT', 'system', '0', 'Initial server cluster synchronization completed.'),
    (2, 'reseller', '114.124.200.5', 'PROVISION_ACCOUNT', 'hosting_account', '1', 'Provisioned hosting account for domain tokobajuonline.com.'),
    (4, 'customer', '114.124.200.5', 'DNS_RECORD_UPDATE', 'dns_record', '1', 'Updated A record for tokobajuonline.com to 103.145.226.10.')
  `);

  // 15. API Keys
  db.run(`
    INSERT INTO api_keys (user_id, key_name, api_key, scopes, rate_limit_per_min)
    VALUES 
    (1, 'Root Production Agent', 'cpro_live_948f2a1b7c3d4e5f6a7b8c9d0e1f2a3b', '["read","write","provision","billing","servers","dns"]', 300),
    (2, 'WHMCS Billing Integration', 'cpro_live_7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', '["read","provision","billing","dns"]', 120)
  `);

  // 16. Queue Jobs
  db.run(`
    INSERT INTO queue_jobs (job_type, payload, status, created_at, completed_at)
    VALUES 
    ('GENERATE_AUTO_SSL', '{"domain":"tokobajuonline.com","account_id":1}', 'completed', datetime('now', '-2 hours'), datetime('now', '-2 hours')),
    ('CREATE_SCHEDULED_BACKUP', '{"account_id":1,"type":"database"}', 'completed', datetime('now', '-30 minutes'), datetime('now', '-28 minutes')),
    ('HEALTH_CHECK_SERVICES', '{"server_id":1}', 'completed', datetime('now', '-5 minutes'), datetime('now', '-5 minutes'))
  `);

  // 17. IP Firewall
  db.run(`
    INSERT INTO ip_firewall (ip_address, type, note)
    VALUES 
    ('103.145.226.0/24', 'whitelist', 'Trusted Datacenter Internal Subnet'),
    ('45.143.203.11', 'blacklist', 'Detected SSH Brute Force attempt (Fail2ban trigger)'),
    ('194.26.29.80', 'blacklist', 'Automated WordPress XML-RPC attack')
  `);

  // 18. Notifications
  db.run(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES 
    (1, 'Cluster Online', 'Semua 3 node server aktif dan beroperasi normal.', 'success', '/servers'),
    (2, 'Provisioning Berhasil', 'Akun hosting untuk tokobajuonline.com telah aktif beserta SSL Let''s Encrypt.', 'success', '/accounts'),
    (4, 'Tagihan Baru Diterbitkan', 'Tagihan INV-2026-0041 sebesar Rp 27.750 telah terbit.', 'warning', '/billing')
  `);

  console.log('[Seed] Database successfully populated with initial data!');
}
