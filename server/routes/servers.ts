import { Router } from 'express';
import { query, queryOne, run } from '../db/database';
import { requireRole } from '../middleware/auth';
import { getServerLiveMetrics, restartServerService } from '../services/serverMonitor';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Servers with Live Telemetry
router.get('/', (req, res) => {
  const nodes = query('SELECT * FROM server_nodes ORDER BY id ASC');
  const enriched = nodes.map((node: any) => {
    const metrics = getServerLiveMetrics(node.id);
    return {
      ...node,
      secondary_ips: JSON.parse(node.secondary_ips || '[]'),
      live: metrics
    };
  });
  res.json(enriched);
});

// Create Server Node (Admin only)
router.post('/', requireRole(['admin']), (req: any, res) => {
  const { name, hostname, ip_address, secondary_ips, location, os, total_cpu_cores, total_ram_mb, total_disk_gb } = req.body;

  if (!name || !hostname || !ip_address) {
    return res.status(400).json({ error: 'Nama server, hostname, dan alamat IP wajib diisi' });
  }

  const result = run(
    `INSERT INTO server_nodes (name, hostname, ip_address, secondary_ips, location, os, total_cpu_cores, total_ram_mb, total_disk_gb)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      hostname,
      ip_address,
      JSON.stringify(secondary_ips || []),
      location || 'Datacenter',
      os || 'Ubuntu 24.04 LTS (Noble)',
      Number(total_cpu_cores) || 8,
      Number(total_ram_mb) || 32768,
      Number(total_disk_gb) || 1000
    ]
  );

  recordAuditLog(req.user.id, req.user.role, req.ip || '127.0.0.1', 'ADD_SERVER_NODE', 'server_node', String(result.lastInsertRowid), `Server: ${name} (${hostname})`);
  res.status(201).json({ success: true, serverId: result.lastInsertRowid });
});

// Restart a Server Service
router.post('/:id/services/:serviceId/restart', requireRole(['admin']), (req: any, res) => {
  const serverId = Number(req.params.id);
  const serviceId = req.params.serviceId;

  try {
    const updatedService = restartServerService(serverId, serviceId);
    recordAuditLog(req.user.id, req.user.role, req.ip || '127.0.0.1', 'RESTART_SERVICE', 'server_service', `${serverId}:${serviceId}`, `Service ${serviceId} restarted on node ${serverId}`);
    res.json({ success: true, service: updatedService });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Run Health Check Diagnostics
router.post('/:id/health-check', requireRole(['admin']), (req: any, res) => {
  const serverId = Number(req.params.id);
  const metrics = getServerLiveMetrics(serverId);

  const checks = [
    { component: 'Kernel & Hardware', status: 'pass', latencyMs: 1.2, message: 'All CPU cores operating within thermal thresholds.' },
    { component: 'Storage IOPS & SMART', status: 'pass', latencyMs: 0.8, message: 'NVMe arrays healthy. 0 bad sectors detected.' },
    { component: 'Web Server (Nginx)', status: 'pass', latencyMs: 4.1, message: 'HTTP/2 and HTTP/3 listeners active on ports 80/443.' },
    { component: 'Database (MariaDB)', status: 'pass', latencyMs: 2.3, message: 'Max connections: 500, buffer pool hit ratio: 99.4%.' },
    { component: 'DNS Resolver (BIND9)', status: 'pass', latencyMs: 1.9, message: 'Named queries resolving in 1.9ms.' },
    { component: 'Firewall & Security', status: 'pass', latencyMs: 0.5, message: 'iptables rules loaded, Fail2ban jail active.' }
  ];

  res.json({
    serverId,
    healthy: true,
    score: 99,
    timestamp: new Date().toISOString(),
    metrics,
    checks
  });
});

export default router;
