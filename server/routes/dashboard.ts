import { Router } from 'express';
import { query, queryOne } from '../db/database';
import { getServerLiveMetrics } from '../services/serverMonitor';

const router = Router();

router.get('/stats', (req: any, res) => {
  const user = req.user;
  const role = user?.role || 'admin';

  if (role === 'admin') {
    const totalServers = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM server_nodes')?.count || 0;
    const totalResellers = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = "reseller"')?.count || 0;
    const totalCustomers = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = "customer"')?.count || 0;
    const totalAccounts = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM hosting_accounts')?.count || 0;
    const activeAccounts = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM hosting_accounts WHERE status = "active"')?.count || 0;
    const totalRevenue = queryOne<{ sum: number }>('SELECT SUM(total_amount) as sum FROM invoices WHERE status = "paid"')?.sum || 0;
    const unpaidInvoicesCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM invoices WHERE status = "unpaid"')?.count || 0;
    const pendingJobsCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM queue_jobs WHERE status = "pending"')?.count || 0;

    const diskSum = queryOne<{ sum: number }>('SELECT SUM(disk_used_mb) as sum FROM hosting_accounts')?.sum || 0;
    const bwSum = queryOne<{ sum: number }>('SELECT SUM(bandwidth_used_mb) as sum FROM hosting_accounts')?.sum || 0;

    const primaryServerMetrics = getServerLiveMetrics(1);

    const recentAccounts = query(`
      SELECT ha.id, ha.domain, ha.username, ha.status, ha.created_at, u.full_name as customer_name, hp.name as package_name
      FROM hosting_accounts ha
      JOIN users u ON ha.customer_id = u.id
      JOIN hosting_packages hp ON ha.package_id = hp.id
      ORDER BY ha.id DESC LIMIT 5
    `);

    const recentInvoices = query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.status, i.due_date, u.full_name as customer_name
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      ORDER BY i.id DESC LIMIT 5
    `);

    const recentAuditLogs = query(`
      SELECT id, user_role, ip_address, action, entity_type, details, created_at
      FROM audit_logs
      ORDER BY id DESC LIMIT 6
    `);

    return res.json({
      role: 'admin',
      metrics: {
        totalServers,
        totalResellers,
        totalCustomers,
        totalAccounts,
        activeAccounts,
        totalRevenue,
        unpaidInvoicesCount,
        pendingJobsCount,
        diskUsedMb: diskSum,
        bandwidthUsedMb: bwSum,
        serverLive: primaryServerMetrics
      },
      recentAccounts,
      recentInvoices,
      recentAuditLogs
    });
  }

  if (role === 'reseller') {
    const resellerId = user.id;
    const totalCustomers = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE reseller_id = ?', [resellerId])?.count || 0;
    const totalAccounts = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM hosting_accounts WHERE reseller_id = ?', [resellerId])?.count || 0;
    const activeAccounts = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM hosting_accounts WHERE reseller_id = ? AND status = "active"', [resellerId])?.count || 0;
    const resellerBalance = queryOne<{ balance: number }>('SELECT balance FROM users WHERE id = ?', [resellerId])?.balance || 0;

    const diskUsedMb = queryOne<{ sum: number }>('SELECT SUM(disk_used_mb) as sum FROM hosting_accounts WHERE reseller_id = ?', [resellerId])?.sum || 0;
    const bwUsedMb = queryOne<{ sum: number }>('SELECT SUM(bandwidth_used_mb) as sum FROM hosting_accounts WHERE reseller_id = ?', [resellerId])?.sum || 0;

    // Reseller allocation limits (e.g. Master Reseller 50: 100GB Disk, 1000GB BW, 50 Accounts)
    const quotaLimits = {
      maxAccounts: 50,
      maxDiskMb: 102400,
      maxBandwidthMb: 1024000
    };

    const myAccounts = query(`
      SELECT ha.id, ha.domain, ha.username, ha.status, ha.disk_used_mb, ha.bandwidth_used_mb, ha.ssl_status, u.full_name as customer_name, hp.name as package_name
      FROM hosting_accounts ha
      JOIN users u ON ha.customer_id = u.id
      JOIN hosting_packages hp ON ha.package_id = hp.id
      WHERE ha.reseller_id = ?
      ORDER BY ha.id DESC LIMIT 5
    `, [resellerId]);

    const myInvoices = query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.status, i.due_date, u.full_name as customer_name
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      WHERE i.reseller_id = ?
      ORDER BY i.id DESC LIMIT 5
    `, [resellerId]);

    return res.json({
      role: 'reseller',
      metrics: {
        totalCustomers,
        totalAccounts,
        activeAccounts,
        resellerBalance,
        diskUsedMb,
        bandwidthUsedMb: bwUsedMb,
        quotaLimits
      },
      recentAccounts: myAccounts,
      recentInvoices: myInvoices
    });
  }

  // Customer Dashboard
  const customerId = user.id;
  const accounts = query(`
    SELECT ha.*, hp.name as package_name, hp.disk_mb as package_disk_mb, hp.bandwidth_mb as package_bw_mb, sn.ip_address as server_ip
    FROM hosting_accounts ha
    JOIN hosting_packages hp ON ha.package_id = hp.id
    JOIN server_nodes sn ON ha.server_id = sn.id
    WHERE ha.customer_id = ?
  `, [customerId]);

  const unpaidInvoices = query(`
    SELECT * FROM invoices WHERE user_id = ? AND status = 'unpaid' ORDER BY id DESC
  `, [customerId]);

  const totalDbs = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM databases db
    JOIN hosting_accounts ha ON db.hosting_account_id = ha.id
    WHERE ha.customer_id = ?
  `, [customerId])?.count || 0;

  const totalEmails = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM email_accounts ea
    JOIN hosting_accounts ha ON ea.hosting_account_id = ha.id
    WHERE ha.customer_id = ?
  `, [customerId])?.count || 0;

  return res.json({
    role: 'customer',
    metrics: {
      totalAccounts: accounts.length,
      totalDatabases: totalDbs,
      totalEmails: totalEmails,
      unpaidInvoicesCount: unpaidInvoices.length,
      balance: user.balance || 0
    },
    accounts,
    unpaidInvoices
  });
});

export default router;
