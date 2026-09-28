# Cloud PRO - Enterprise Reseller Web Hosting Management Server
## System Architecture & Technical Specifications

### 1. Overview
Cloud PRO is an enterprise-grade multi-tenant web hosting management platform engineered for hosting providers, resellers, and end-customers. It mirrors industry standards like cPanel/WHM and DirectAdmin with modern web technologies, automated provisioning, and strict multi-tenant isolation.

---

### 2. Multi-Tier Hierarchy (RBAC)
```
┌────────────────────────────────────────────────────────┐
│                   ROOT SUPERADMIN                      │
│   • Infrastructure & Multi-Server Nodes Management     │
│   • System Services (Nginx, MariaDB, PHP-FPM, BIND9)   │
│   • Global Reseller Lifecycle & Resource Quotas        │
│   • System-wide Billing, Firewall, Audit & Queue       │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│   RESELLER A (Tenant 1)   │ │   RESELLER B (Tenant 2)   │
│  • White-Label Branding   │ │  • White-Label Branding   │
│  • Custom Sub-Packages    │ │  • Custom Sub-Packages    │
│  • Quota Allocation       │ │  • Quota Allocation       │
│  • Customer Management    │ │  • Customer Management    │
│  • Reseller Balance/Ledger│ │  • Reseller Balance/Ledger│
└────────────┬──────────────┘ └────────────┬──────────────┘
             │                             │
    ┌────────┴────────┐           ┌────────┴────────┐
    ▼                 ▼           ▼                 ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│  CUSTOMER 1  ││  CUSTOMER 2  ││  CUSTOMER 3  ││  CUSTOMER 4  │
│ • Files/FTP  ││ • Files/FTP  ││ • Files/FTP  ││ • Files/FTP  │
│ • MySQL DBs  ││ • MySQL DBs  ││ • MySQL DBs  ││ • MySQL DBs  │
│ • DNS Zones  ││ • DNS Zones  ││ • DNS Zones  ││ • DNS Zones  │
│ • Auto-SSL   ││ • Auto-SSL   ││ • Auto-SSL   ││ • Auto-SSL   │
│ • PHP Select ││ • PHP Select ││ • PHP Select ││ • PHP Select │
│ • 1-Click BK ││ • 1-Click BK ││ • 1-Click BK ││ • 1-Click BK │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

---

### 3. Relational Database Schema Specification
The persistence engine runs SQLite via `sql.js` with ACID compliance, relational foreign keys, indexes, and continuous binary disk snapshotting.

- **users**: Master accounts table (Admin, Resellers, Customers)
- **reseller_settings**: White-label customizations (brand, logo, theme, custom panel domain)
- **server_nodes**: Infrastructure servers (IPs, CPU/RAM/Disk stats, OS, status)
- **hosting_packages**: Hosting package tiers with resource limits
- **hosting_accounts**: Active hosting virtual hosts (domain, disk/bandwidth usage, PHP version, SSL state)
- **dns_zones & dns_records**: Full zone files (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA)
- **databases**: MySQL/MariaDB database instances and database users
- **email_accounts**: Virtual email accounts, forwarders, auto-responders
- **ftp_accounts**: Virtual FTP/SFTP accounts with directory jail
- **cron_jobs**: Scheduled background crons per hosting account
- **backups**: Automated and manual full/DB backup snapshots with 1-click restore
- **invoices & transactions**: Automated recurring invoices, tax (PPN 11%), payments, balance ledger
- **audit_logs**: Tamper-evident activity logs recording IP, user, and payload diffs
- **api_keys**: Reseller/Admin programmatic API keys with scoped permissions
- **queue_jobs**: Asynchronous background jobs engine for heavy operations
- **ip_firewall**: IP Whitelist and Blacklist rule engine
- **notifications**: Real-time notifications and alerts for users

---

### 4. Automated Provisioning Lifecycle
1. **Validation**: Check Reseller limits (available accounts, disk space, bandwidth pool).
2. **Virtual Host Allocation**: Assign domain to Server Node, create directory structure:
   `/home/{username}/public_html`, `/home/{username}/logs`, `/home/{username}/ssl`.
3. **Web Server & PHP-FPM Configuration**: Generate vhost configuration and PHP-FPM socket pool.
4. **DNS Zone Generation**: Auto-populate standard DNS records (A, CNAME www, MX mail, SPF TXT).
5. **Auto-SSL Issuance**: Request Let's Encrypt SSL certificate and bind HTTPS 443 with HTTP→HTTPS redirect.
6. **Default Database & Email**: Create initial email account `webmaster@{domain}`.
7. **Billing & Logging**: Generate creation transaction, invoice, and append audit log.
