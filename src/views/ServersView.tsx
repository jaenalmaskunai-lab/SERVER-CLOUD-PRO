import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { ServerNode, ServerService } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  Server,
  Plus,
  RefreshCw,
  RotateCcw,
  Activity,
  CheckCircle2,
  HardDrive,
  Cpu,
  Wifi,
  ShieldAlert,
  Terminal,
  Zap
} from 'lucide-react';

export const ServersView: React.FC = () => {
  const { showToast } = useNotification();
  const [servers, setServers] = useState<ServerNode[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [restartingService, setRestartingService] = useState<string | null>(null);

  // Health check report
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [healthReport, setHealthReport] = useState<any>(null);

  // Add Server Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [location, setLocation] = useState('Jakarta, Indonesia');
  const [cpuCores, setCpuCores] = useState('16');
  const [ramMb, setRamMb] = useState('65536');
  const [diskGb, setDiskGb] = useState('2048');

  const fetchServers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<ServerNode[]>('/api/servers');
      setServers(data);
      if (data.length > 0 && !data.find((s) => s.id === selectedServerId)) {
        setSelectedServerId(data[0].id);
      }
    } catch (err: any) {
      showToast('Gagal memuat node server', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartService = async (serviceId: string, serviceName: string) => {
    setRestartingService(serviceId);
    try {
      await apiRequest(`/api/servers/${selectedServerId}/services/${serviceId}/restart`, {
        method: 'POST'
      });
      showToast('Service Berhasil Direstart', `${serviceName} pada node #${selectedServerId} kembali berjalan normal.`, 'success');
      fetchServers();
    } catch (err: any) {
      showToast('Gagal me-restart service', err.message, 'danger');
    } finally {
      setRestartingService(null);
    }
  };

  const handleRunHealthCheck = async () => {
    setRunningHealthCheck(true);
    setHealthReport(null);
    try {
      const res = await apiRequest(`/api/servers/${selectedServerId}/health-check`, {
        method: 'POST'
      });
      setHealthReport(res);
      showToast('Health Check Selesai', 'Seluruh komponen hardware dan software cluster beroperasi 100% prima.', 'success');
    } catch (err: any) {
      showToast('Gagal menjalankan health check', err.message, 'danger');
    } finally {
      setRunningHealthCheck(false);
    }
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/servers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          hostname,
          ip_address: ipAddress,
          location,
          total_cpu_cores: Number(cpuCores),
          total_ram_mb: Number(ramMb),
          total_disk_gb: Number(diskGb)
        })
      });

      showToast('Server Node Ditambahkan', `Node ${name} berhasil didaftarkan ke cluster.`, 'success');
      setIsAddOpen(false);
      fetchServers();
    } catch (err: any) {
      showToast('Gagal menambah server', err.message, 'danger');
    }
  };

  const activeServer = servers.find((s) => s.id === selectedServerId) || servers[0];
  const live = activeServer?.live;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            <span>Manajemen Multi-Server & Pemantauan Layanan Real-time</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoring utilisasi CPU, RAM, Disk, beban server, serta kontrol restart service (Nginx, MariaDB, PHP-FPM, BIND9, Fail2ban).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunHealthCheck}
            disabled={runningHealthCheck}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <Zap className={`w-4 h-4 text-amber-400 ${runningHealthCheck ? 'animate-bounce' : ''}`} />
            <span>{runningHealthCheck ? 'Memeriksa Cluster...' : 'Diagnostik Health Check'}</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Server Node</span>
          </button>
        </div>
      </div>

      {/* Node Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
        {servers.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedServerId(s.id)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              selectedServerId === s.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${s.status === 'online' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span>{s.name}</span>
            <span className="font-mono text-[11px] opacity-80">({s.ip_address})</span>
          </button>
        ))}
      </div>

      {/* Selected Node Realtime Telemetry Grid */}
      {live && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU Card */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">CPU Utilization</span>
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-bold text-white tabular-nums">{live.cpu.percent}%</span>
              <span className="text-xs text-slate-400">{live.cpu.cores} Cores</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  live.cpu.percent > 80 ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${live.cpu.percent}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Load: {live.cpu.loadAverages.join(', ')}
            </div>
          </div>

          {/* RAM Card */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">RAM Usage</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-bold text-white tabular-nums">{live.ram.percent}%</span>
              <span className="text-xs text-slate-400">{(live.ram.totalMb / 1024).toFixed(0)} GB Total</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${live.ram.percent}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {(live.ram.usedMb / 1024).toFixed(1)} GB Digunakan
            </div>
          </div>

          {/* Disk Card */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">NVMe RAID-10</span>
              <HardDrive className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-bold text-white tabular-nums">{live.disk.percent}%</span>
              <span className="text-xs text-slate-400">{live.disk.totalGb} GB</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${live.disk.percent}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {live.disk.usedGb} GB Terpakai
            </div>
          </div>

          {/* Network Throughput */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">Traffic Network</span>
              <Wifi className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-2xl font-bold text-white tabular-nums">
                {live.network.outMbps} <span className="text-xs font-sans text-slate-400">Mbps Out</span>
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              Inbound: <span className="text-emerald-400 font-bold tabular-nums">{live.network.inMbps} Mbps</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Interface: 10Gbps Uplink SFP+
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Report if triggered */}
      {healthReport && (
        <div className="p-5 bg-slate-900/90 border border-emerald-500/40 rounded-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Laporan Hasil Diagnostik Node Server #{healthReport.serverId}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-xs font-mono font-bold border border-emerald-800">
              Health Score: {healthReport.score}/100 PASS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {healthReport.checks.map((c: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{c.component}</span>
                  <span className="font-mono text-[10px] text-emerald-400">{c.latencyMs}ms</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{c.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Services Control Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Status Layanan Daemon (Systemd Services)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola status dan eksekusi restart runtime web server, database, DNS, dan daemon proteksi keamanan.
            </p>
          </div>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Layanan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Port Listener</th>
                <th className="py-3 px-4 text-right">Konsumsi Memori</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {(live?.services || []).map((srv: ServerService) => (
                <tr key={srv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white font-sans">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{srv.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      systemd: {srv.id}.service
                    </div>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300">
                      {srv.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-300 tabular-nums">
                    {srv.port > 0 ? `:${srv.port}` : 'Kernel Unix Sock'}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300 tabular-nums">
                    {srv.memoryUsageMb} MB
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <StatusBadge status={srv.status} />
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => handleRestartService(srv.id, srv.name)}
                      disabled={restartingService === srv.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                      title="Kirim sinyal restart systemctl"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${restartingService === srv.id ? 'animate-spin text-blue-400' : ''}`} />
                      <span>{restartingService === srv.id ? 'Restarting...' : 'Restart'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Server Node */}
      {isAddOpen && (
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Tambah Server Node Baru"
          subtitle="Daftarkan server baremetal / VPS Linux ke dalam cluster Cloud PRO"
          maxWidth="2xl"
        >
          <form onSubmit={handleAddServer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Node *</label>
                <input
                  type="text"
                  required
                  placeholder="Node ID-SBY-01 (Intiland DC)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">FQDN Hostname *</label>
                <input
                  type="text"
                  required
                  placeholder="srv-sby01.cloudpro.id"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Alamat IP Publik *</label>
                <input
                  type="text"
                  required
                  placeholder="103.145.228.50"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Lokasi Datacenter</label>
                <input
                  type="text"
                  placeholder="Surabaya, Indonesia"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Jumlah CPU Cores</label>
                <input
                  type="number"
                  value={cpuCores}
                  onChange={(e) => setCpuCores(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Total RAM (MB)</label>
                <input
                  type="number"
                  value={ramMb}
                  onChange={(e) => setRamMb(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm"
              >
                Hubungkan Server Node
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
