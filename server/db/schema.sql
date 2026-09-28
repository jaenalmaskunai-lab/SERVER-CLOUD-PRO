-- Cloud PRO Relational Schema (SQLite with Foreign Keys and Indexes)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'reseller', 'customer')) NOT NULL DEFAULT 'customer',
  reseller_id INTEGER,
  full_name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  status TEXT CHECK(status IN ('active', 'suspended')) NOT NULL DEFAULT 'active',
  balance REAL NOT NULL DEFAULT 0.0,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  two_factor_secret TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_reseller_id ON users(reseller_id);

CREATE TABLE IF NOT EXISTS reseller_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  brand_name TEXT NOT NULL DEFAULT 'Cloud PRO Reseller',
  logo_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  accent_color TEXT DEFAULT '#2563eb',
  custom_domain TEXT DEFAULT 'panel.resellerdomain.com',
  support_email TEXT DEFAULT 'support@resellerdomain.com',
  invoice_footer TEXT DEFAULT 'Terima kasih atas kepercayaan Anda menggunakan layanan kami.',
  custom_css TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hostname TEXT UNIQUE NOT NULL,
  ip_address TEXT NOT NULL,
  secondary_ips TEXT DEFAULT '[]',
  location TEXT NOT NULL,
  os TEXT NOT NULL DEFAULT 'Ubuntu 24.04 LTS (Noble)',
  total_cpu_cores INTEGER NOT NULL DEFAULT 8,
  total_ram_mb INTEGER NOT NULL DEFAULT 32768,
  total_disk_gb INTEGER NOT NULL DEFAULT 1000,
  status TEXT CHECK(status IN ('online', 'degraded', 'offline')) NOT NULL DEFAULT 'online',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hosting_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  reseller_id INTEGER,
  disk_mb INTEGER NOT NULL DEFAULT 5120,
  bandwidth_mb INTEGER NOT NULL DEFAULT 51200,
  cpu_percent INTEGER NOT NULL DEFAULT 100,
  ram_mb INTEGER NOT NULL DEFAULT 1024,
  max_domains INTEGER NOT NULL DEFAULT 1,
  max_subdomains INTEGER NOT NULL DEFAULT 5,
  max_databases INTEGER NOT NULL DEFAULT 3,
  max_emails INTEGER NOT NULL DEFAULT 5,
  max_ftp INTEGER NOT NULL DEFAULT 2,
  max_cron INTEGER NOT NULL DEFAULT 3,
  allow_ssl INTEGER NOT NULL DEFAULT 1,
  allow_backup INTEGER NOT NULL DEFAULT 1,
  price_monthly REAL NOT NULL DEFAULT 50000,
  price_annual REAL NOT NULL DEFAULT 500000,
  status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packages_reseller ON hosting_packages(reseller_id);

CREATE TABLE IF NOT EXISTS hosting_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  reseller_id INTEGER,
  server_id INTEGER NOT NULL,
  package_id INTEGER NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT CHECK(status IN ('active', 'suspended', 'pending', 'terminated')) NOT NULL DEFAULT 'active',
  disk_used_mb INTEGER NOT NULL DEFAULT 120,
  bandwidth_used_mb INTEGER NOT NULL DEFAULT 1540,
  php_version TEXT NOT NULL DEFAULT '8.2',
  php_extensions TEXT NOT NULL DEFAULT '["curl","gd","mbstring","openssl","pdo_mysql","zip","opcache"]',
  ssl_status TEXT CHECK(ssl_status IN ('active', 'pending', 'expired', 'none')) NOT NULL DEFAULT 'active',
  ssl_issuer TEXT DEFAULT "Let's Encrypt Authority X3",
  ssl_expires_at TEXT DEFAULT (datetime('now', '+90 days')),
  auto_ssl INTEGER NOT NULL DEFAULT 1,
  force_https INTEGER NOT NULL DEFAULT 1,
  suspended_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+1 year')),
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (server_id) REFERENCES server_nodes(id) ON DELETE RESTRICT,
  FOREIGN KEY (package_id) REFERENCES hosting_packages(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_accounts_customer ON hosting_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_reseller ON hosting_accounts(reseller_id);
CREATE INDEX IF NOT EXISTS idx_accounts_domain ON hosting_accounts(domain);

CREATE TABLE IF NOT EXISTS dns_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hosting_account_id INTEGER UNIQUE NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dns_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  ttl INTEGER NOT NULL DEFAULT 3600,
  priority INTEGER DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (zone_id) REFERENCES dns_zones(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dns_records_zone ON dns_records(zone_id);

CREATE TABLE IF NOT EXISTS databases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hosting_account_id INTEGER NOT NULL,
  db_name TEXT NOT NULL,
  db_user TEXT NOT NULL,
  charset TEXT NOT NULL DEFAULT 'utf8mb4',
  size_mb REAL NOT NULL DEFAULT 12.5,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hosting_account_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  quota_mb INTEGER NOT NULL DEFAULT 1024,
  used_mb REAL NOT NULL DEFAULT 45.2,
  forward_to TEXT DEFAULT '',
  is_autoresponder INTEGER NOT NULL DEFAULT 0,
  autoresponder_body TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ftp_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hosting_account_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  directory TEXT NOT NULL DEFAULT '/public_html',
  quota_mb INTEGER NOT NULL DEFAULT 5120,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cron_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hosting_account_id INTEGER NOT NULL,
  command TEXT NOT NULL,
  minute TEXT NOT NULL DEFAULT '0',
  hour TEXT NOT NULL DEFAULT '*',
  day TEXT NOT NULL DEFAULT '*',
  month TEXT NOT NULL DEFAULT '*',
  weekday TEXT NOT NULL DEFAULT '*',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_run TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hosting_account_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('full', 'database', 'files')) NOT NULL DEFAULT 'full',
  file_name TEXT NOT NULL,
  file_size_mb REAL NOT NULL DEFAULT 42.8,
  storage_type TEXT CHECK(storage_type IN ('local', 'remote')) NOT NULL DEFAULT 'local',
  status TEXT CHECK(status IN ('completed', 'in_progress', 'failed')) NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  reseller_id INTEGER,
  hosting_account_id INTEGER,
  package_id INTEGER,
  amount REAL NOT NULL,
  tax REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL,
  status TEXT CHECK(status IN ('unpaid', 'paid', 'cancelled', 'refunded')) NOT NULL DEFAULT 'unpaid',
  payment_method TEXT DEFAULT 'qris',
  paid_at TEXT,
  due_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (hosting_account_id) REFERENCES hosting_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (package_id) REFERENCES hosting_packages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('deposit', 'purchase', 'renewal', 'refund')) NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_role TEXT NOT NULL DEFAULT 'system',
  ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  scopes TEXT NOT NULL DEFAULT '["read","provision","billing"]',
  rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS ip_firewall (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT UNIQUE NOT NULL,
  type TEXT CHECK(type IN ('whitelist', 'blacklist')) NOT NULL DEFAULT 'blacklist',
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK(type IN ('info', 'warning', 'danger', 'success')) NOT NULL DEFAULT 'info',
  is_read INTEGER NOT NULL DEFAULT 0,
  link TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
