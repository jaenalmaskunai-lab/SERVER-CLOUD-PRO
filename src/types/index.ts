export type UserRole = 'admin' | 'reseller' | 'customer';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  reseller_id: number | null;
  full_name: string;
  phone?: string;
  company?: string;
  status: 'active' | 'suspended';
  balance: number;
  two_factor_enabled?: boolean;
  created_at: string;
}

export interface ResellerSettings {
  id?: number;
  user_id: number;
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  accent_color: string;
  custom_domain: string;
  support_email: string;
  invoice_footer: string;
}

export interface ServerService {
  id: string;
  name: string;
  category: 'web' | 'database' | 'php' | 'mail' | 'dns' | 'ftp' | 'security';
  status: 'running' | 'reloading' | 'stopped' | 'failed';
  uptimeSeconds: number;
  memoryUsageMb: number;
  port: number;
}

export interface ServerLiveTelemetry {
  serverId: number;
  timestamp: string;
  cpu: {
    percent: number;
    cores: number;
    loadAverages: [string, string, string];
  };
  ram: {
    usedMb: number;
    totalMb: number;
    percent: number;
  };
  disk: {
    usedGb: number;
    totalGb: number;
    percent: number;
  };
  network: {
    inMbps: number;
    outMbps: number;
  };
  services: ServerService[];
}

export interface ServerNode {
  id: number;
  name: string;
  hostname: string;
  ip_address: string;
  secondary_ips: string[];
  location: string;
  os: string;
  total_cpu_cores: number;
  total_ram_mb: number;
  total_disk_gb: number;
  status: 'online' | 'degraded' | 'offline';
  is_default: number;
  live?: ServerLiveTelemetry;
}

export interface HostingPackage {
  id: number;
  name: string;
  slug: string;
  reseller_id: number | null;
  reseller_name?: string;
  disk_mb: number;
  bandwidth_mb: number;
  cpu_percent: number;
  ram_mb: number;
  max_domains: number;
  max_subdomains: number;
  max_databases: number;
  max_emails: number;
  max_ftp: number;
  max_cron: number;
  allow_ssl: number;
  allow_backup: number;
  price_monthly: number;
  price_annual: number;
  status: 'active' | 'inactive';
  accounts_count?: number;
}

export interface HostingAccount {
  id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  reseller_id: number | null;
  reseller_name?: string;
  server_id: number;
  server_name?: string;
  server_ip?: string;
  package_id: number;
  package_name?: string;
  package_disk_mb?: number;
  package_bw_mb?: number;
  domain: string;
  username: string;
  status: 'active' | 'suspended' | 'pending' | 'terminated';
  disk_used_mb: number;
  bandwidth_used_mb: number;
  php_version: string;
  php_extensions?: string;
  ssl_status: 'active' | 'pending' | 'expired' | 'none';
  ssl_issuer: string;
  ssl_expires_at: string;
  auto_ssl: number;
  force_https: number;
  suspended_reason?: string | null;
  created_at: string;
  expires_at?: string;
  counts?: {
    databases: number;
    emails: number;
    ftp: number;
    cron: number;
  };
}

export interface DnsZone {
  id: number;
  hosting_account_id: number;
  domain: string;
  account_domain?: string;
  record_count?: number;
}

export interface DnsRecord {
  id: number;
  zone_id: number;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA';
  name: string;
  content: string;
  ttl: number;
  priority?: number | null;
}

export interface DatabaseItem {
  id: number;
  hosting_account_id: number;
  db_name: string;
  db_user: string;
  charset: string;
  size_mb: number;
  account_domain?: string;
  account_username?: string;
}

export interface EmailItem {
  id: number;
  hosting_account_id: number;
  email: string;
  quota_mb: number;
  used_mb: number;
  forward_to?: string;
  is_autoresponder?: number;
  autoresponder_body?: string;
  account_domain?: string;
}

export interface CronItem {
  id: number;
  hosting_account_id: number;
  command: string;
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
  is_active: number;
  last_run?: string;
  account_domain?: string;
}

export interface BackupItem {
  id: number;
  hosting_account_id: number;
  type: 'full' | 'database' | 'files';
  file_name: string;
  file_size_mb: number;
  storage_type: 'local' | 'remote';
  status: 'completed' | 'in_progress' | 'failed';
  created_at: string;
  account_domain?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  reseller_id: number | null;
  reseller_name?: string;
  hosting_account_id?: number | null;
  account_domain?: string;
  package_id?: number | null;
  package_name?: string;
  amount: number;
  tax: number;
  total_amount: number;
  status: 'unpaid' | 'paid' | 'cancelled' | 'refunded';
  payment_method: string;
  paid_at?: string | null;
  due_date: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_role: string;
  full_name?: string;
  username?: string;
  ip_address: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  created_at: string;
}

export interface ApiKeyItem {
  id: number;
  key_name: string;
  api_key: string;
  scopes: string[];
  rate_limit_per_min: number;
  last_used_at?: string;
  created_at: string;
}

export interface FirewallRule {
  id: number;
  ip_address: string;
  type: 'whitelist' | 'blacklist';
  note: string;
  created_at: string;
}

export interface QueueJobItem {
  id: number;
  job_type: string;
  payload: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
