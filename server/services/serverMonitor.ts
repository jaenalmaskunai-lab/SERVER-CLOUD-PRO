import { query } from '../db/database';

export interface ServiceState {
  id: string;
  name: string;
  category: 'web' | 'database' | 'php' | 'mail' | 'dns' | 'ftp' | 'security';
  status: 'running' | 'reloading' | 'stopped' | 'failed';
  uptimeSeconds: number;
  memoryUsageMb: number;
  port: number;
}

// In-memory service state simulating live systemd services
const serviceStates: Record<number, Record<string, ServiceState>> = {
  1: {
    nginx: { id: 'nginx', name: 'Nginx Web Server', category: 'web', status: 'running', uptimeSeconds: 842000, memoryUsageMb: 142, port: 80 },
    mariadb: { id: 'mariadb', name: 'MariaDB 11.2 (MySQL)', category: 'database', status: 'running', uptimeSeconds: 842000, memoryUsageMb: 1240, port: 3306 },
    php82_fpm: { id: 'php82_fpm', name: 'PHP-FPM 8.2 Pool', category: 'php', status: 'running', uptimeSeconds: 421000, memoryUsageMb: 380, port: 9002 },
    php83_fpm: { id: 'php83_fpm', name: 'PHP-FPM 8.3 Pool', category: 'php', status: 'running', uptimeSeconds: 421000, memoryUsageMb: 420, port: 9003 },
    postfix: { id: 'postfix', name: 'Postfix MTA (SMTP)', category: 'mail', status: 'running', uptimeSeconds: 842000, memoryUsageMb: 64, port: 25 },
    dovecot: { id: 'dovecot', name: 'Dovecot (IMAP/POP3)', category: 'mail', status: 'running', uptimeSeconds: 842000, memoryUsageMb: 88, port: 993 },
    named: { id: 'named', name: 'BIND9 DNS Server', category: 'dns', status: 'running', uptimeSeconds: 842000, memoryUsageMb: 110, port: 53 },
    proftpd: { id: 'proftpd', name: 'ProFTPD Service', category: 'ftp', status: 'running', uptimeSeconds: 842000, memoryUsageMb: 35, port: 21 },
    redis: { id: 'redis', name: 'Redis Cache Server', category: 'database', status: 'running', uptimeSeconds: 842000, memoryUsageMb: 95, port: 6379 },
    fail2ban: { id: 'fail2ban', name: 'Fail2ban Firewall Sentinel', category: 'security', status: 'running', uptimeSeconds: 842000, memoryUsageMb: 48, port: 0 }
  },
  2: {
    nginx: { id: 'nginx', name: 'Nginx Web Server', category: 'web', status: 'running', uptimeSeconds: 524000, memoryUsageMb: 115, port: 80 },
    mariadb: { id: 'mariadb', name: 'MariaDB 11.2 (MySQL)', category: 'database', status: 'running', uptimeSeconds: 524000, memoryUsageMb: 980, port: 3306 },
    php83_fpm: { id: 'php83_fpm', name: 'PHP-FPM 8.3 Pool', category: 'php', status: 'running', uptimeSeconds: 524000, memoryUsageMb: 310, port: 9003 },
    named: { id: 'named', name: 'BIND9 DNS Server', category: 'dns', status: 'running', uptimeSeconds: 524000, memoryUsageMb: 85, port: 53 },
    fail2ban: { id: 'fail2ban', name: 'Fail2ban Firewall Sentinel', category: 'security', status: 'running', uptimeSeconds: 524000, memoryUsageMb: 42, port: 0 }
  },
  3: {
    nginx: { id: 'nginx', name: 'Nginx Web Server', category: 'web', status: 'running', uptimeSeconds: 984000, memoryUsageMb: 160, port: 80 },
    mariadb: { id: 'mariadb', name: 'MariaDB 11.2 (MySQL)', category: 'database', status: 'running', uptimeSeconds: 984000, memoryUsageMb: 1120, port: 3306 },
    named: { id: 'named', name: 'BIND9 DNS Server', category: 'dns', status: 'running', uptimeSeconds: 984000, memoryUsageMb: 92, port: 53 }
  }
};

export function getServerLiveMetrics(serverId: number) {
  // Generate realistic, smoothly fluctuating telemetry values
  const now = Date.now();
  const timeOffset = Math.sin(now / 15000);
  
  const baseCpu = serverId === 1 ? 28 : (serverId === 2 ? 18 : 34);
  const cpuPercent = Math.min(99, Math.max(8, Math.round(baseCpu + timeOffset * 12)));

  const baseRam = serverId === 1 ? 24500 : (serverId === 2 ? 14200 : 21800);
  const ramUsedMb = Math.round(baseRam + timeOffset * 800);

  const baseDisk = serverId === 1 ? 485 : (serverId === 2 ? 310 : 540);
  const diskUsedGb = baseDisk;

  const load1m = (cpuPercent / 20).toFixed(2);
  const load5m = ((cpuPercent + 4) / 22).toFixed(2);
  const load15m = ((cpuPercent + 2) / 24).toFixed(2);

  const networkInMb = (24.5 + timeOffset * 8).toFixed(1);
  const networkOutMb = (68.2 + timeOffset * 15).toFixed(1);

  const services = serviceStates[serverId] || serviceStates[1];

  return {
    serverId,
    timestamp: new Date().toISOString(),
    cpu: {
      percent: cpuPercent,
      cores: serverId === 2 ? 8 : 16,
      loadAverages: [load1m, load5m, load15m]
    },
    ram: {
      usedMb: ramUsedMb,
      totalMb: serverId === 2 ? 32768 : 65536,
      percent: Math.round((ramUsedMb / (serverId === 2 ? 32768 : 65536)) * 100)
    },
    disk: {
      usedGb: diskUsedGb,
      totalGb: serverId === 2 ? 1024 : 2048,
      percent: Math.round((diskUsedGb / (serverId === 2 ? 1024 : 2048)) * 100)
    },
    network: {
      inMbps: Number(networkInMb),
      outMbps: Number(networkOutMb)
    },
    services: Object.values(services)
  };
}

export function restartServerService(serverId: number, serviceId: string): ServiceState {
  if (!serviceStates[serverId]) {
    serviceStates[serverId] = { ...serviceStates[1] };
  }

  const srv = serviceStates[serverId][serviceId];
  if (!srv) {
    throw new Error(`Service '${serviceId}' tidak ditemukan pada server node ID ${serverId}`);
  }

  srv.status = 'running';
  srv.uptimeSeconds = 2; // restarted
  return srv;
}
