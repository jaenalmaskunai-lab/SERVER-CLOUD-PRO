import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Server,
  Users2,
  UserCheck,
  HardDrive,
  Receipt,
  ShieldCheck,
  Cpu,
  Activity,
  ArrowUpRight,
  Database,
  Mail,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onOpenCreateAccount: () => void;
  onOpenDeposit: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenCreateAccount,
  onOpenDeposit
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/dashboard/stats');
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, [user?.role, user?.id]);

  const role = user?.role || 'admin';
  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {role === 'admin'
                ? 'Pusat Kontrol Infrastruktur Server'
                : (role === 'reseller'
                ? `Panel Reseller - ${user?.company || user?.full_name}`
                : `Area Klien Hosting - ${user?.full_name}`)}
            </h1>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {role === 'admin'
              ? 'Monitoring multi-server cluster, alokasi reseller, dan provisioning akun hosting terpusat.'
              : (role === 'reseller'
              ? 'Kelola pelanggan, paket hosting kustom, dan provisi akun hosting dengan white label branding Anda.'
              : 'Kelola file website, domain, database MySQL, akun email, sertifikat SSL, dan versi PHP Anda.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition-colors"
            title="Perbarui Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {role !== 'customer' ? (
            <button
              onClick={onOpenCreateAccount}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <HardDrive className="w-4 h-4" />
              <span>{role === 'reseller' ? '+ Provisi Akun Pelanggan' : 'Provisi Akun Baru'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCreateAccount}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <HardDrive className="w-4 h-4" />
                <span>+ Tambah Website Baru</span>
              </button>
              <button
                onClick={() => onNavigate('accounts')}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <span>Buka cPanel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      {role === 'admin' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Server Cluster Node"
              value={metrics.totalServers || 3}
              subValue="Online"
              change="100% Uptime"
              changeType="positive"
              icon={<Server className="w-5 h-5 text-blue-400" />}
            />
            <StatCard
              label="Mitra Reseller Aktif"
              value={metrics.totalResellers || 0}
              subValue="Resellers"
              change="Multi-tenant siap"
              changeType="neutral"
              icon={<Users2 className="w-5 h-5 text-indigo-400" />}
            />
            <StatCard
              label="Total Akun Hosting"
              value={metrics.totalAccounts || 0}
              subValue={`(${metrics.activeAccounts || 0} Aktif)`}
              change={`${((metrics.diskUsedMb || 0) / 1024).toFixed(1)} GB Disk Digunakan`}
              changeType="neutral"
              icon={<HardDrive className="w-5 h-5 text-emerald-400" />}
            />
            <StatCard
              label="Pendapatan Terverifikasi"
              value={`Rp ${(metrics.totalRevenue || 0).toLocaleString('id-ID')}`}
              change={`${metrics.unpaidInvoicesCount || 0} Faktur Belum Bayar`}
              changeType={metrics.unpaidInvoicesCount ? 'negative' : 'positive'}
              icon={<Receipt className="w-5 h-5 text-amber-400" />}
            />
          </div>

          {/* Primary Node Telemetry Box */}
          {metrics.serverLive && (
            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Live Telemetry Node ID-JKT-01 (Cyber 1 DC)
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('servers')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <span>Detail Server & Restart Service</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* CPU */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                    <span>Penggunaan CPU (16 Cores)</span>
                    <span className="font-mono tabular-nums text-white font-bold">{metrics.serverLive.cpu.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        metrics.serverLive.cpu.percent > 80 ? 'bg-rose-500' : (metrics.serverLive.cpu.percent > 50 ? 'bg-amber-500' : 'bg-blue-500')
                      }`}
                      style={{ width: `${metrics.serverLive.cpu.percent}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-2">
                    Load Avg: {metrics.serverLive.cpu.loadAverages.join(', ')}
                  </div>
                </div>

                {/* RAM */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                    <span>Penggunaan RAM (64 GB)</span>
                    <span className="font-mono tabular-nums text-white font-bold">{metrics.serverLive.ram.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${metrics.serverLive.ram.percent}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-2">
                    {(metrics.serverLive.ram.usedMb / 1024).toFixed(1)} GB / {(metrics.serverLive.ram.totalMb / 1024).toFixed(0)} GB
                  </div>
                </div>

                {/* Disk */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                    <span>Penyimpanan NVMe RAID-10</span>
                    <span className="font-mono tabular-nums text-white font-bold">{metrics.serverLive.disk.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${metrics.serverLive.disk.percent}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-2">
                    {metrics.serverLive.disk.usedGb} GB / {metrics.serverLive.disk.totalGb} GB
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reseller Dashboard View */}
      {role === 'reseller' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Saldo Kredit Reseller"
              value={`Rp ${(metrics.resellerBalance || 0).toLocaleString('id-ID')}`}
              change="+ Klik untuk Top-up"
              changeType="positive"
              icon={<Receipt className="w-5 h-5 text-emerald-400" />}
            />
            <StatCard
              label="Pelanggan Anda"
              value={metrics.totalCustomers || 0}
              subValue="Orang"
              change="Tenant Aktif"
              changeType="neutral"
              icon={<UserCheck className="w-5 h-5 text-blue-400" />}
            />
            <StatCard
              label="Kuota Akun Terpakai"
              value={`${metrics.totalAccounts || 0} / ${metrics.quotaLimits?.maxAccounts || 50}`}
              subValue="Akun"
              change={`${((metrics.totalAccounts || 0) / (metrics.quotaLimits?.maxAccounts || 50) * 100).toFixed(0)}% Terpakai`}
              changeType="neutral"
              icon={<HardDrive className="w-5 h-5 text-indigo-400" />}
            />
            <StatCard
              label="Penyimpanan Quota Pool"
              value={`${((metrics.diskUsedMb || 0) / 1024).toFixed(1)} GB`}
              subValue={`/ ${(metrics.quotaLimits?.maxDiskMb || 102400) / 1024} GB`}
              change={`${((metrics.bandwidthUsedMb || 0) / 1024).toFixed(1)} GB BW Bulan Ini`}
              changeType="neutral"
              icon={<Cpu className="w-5 h-5 text-amber-400" />}
            />
          </div>
        </>
      )}

      {/* Customer Dashboard View */}
      {role === 'customer' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Akun Hosting Aktif"
            value={metrics.totalAccounts || 0}
            subValue="Virtual Hosts"
            change="Semua Layanan Berjalan"
            changeType="positive"
            icon={<HardDrive className="w-5 h-5 text-blue-400" />}
          />
          <StatCard
            label="Database MySQL"
            value={metrics.totalDatabases || 0}
            subValue="Databases"
            change="MariaDB 11.2"
            changeType="neutral"
            icon={<Database className="w-5 h-5 text-emerald-400" />}
          />
          <StatCard
            label="Alamat Email Kustom"
            value={metrics.totalEmails || 0}
            subValue="Webmail"
            change="Roundcube Webmail"
            changeType="neutral"
            icon={<Mail className="w-5 h-5 text-purple-400" />}
          />
          <StatCard
            label="Tagihan Belum Lunas"
            value={metrics.unpaidInvoicesCount || 0}
            change={metrics.unpaidInvoicesCount ? 'Ada tagihan aktif' : 'Semua tagihan lunas'}
            changeType={metrics.unpaidInvoicesCount ? 'negative' : 'positive'}
            icon={<Receipt className="w-5 h-5 text-amber-400" />}
          />
        </div>
      )}

      {/* Recent Tables (Accounts & Invoices) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hosting Accounts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Akun Hosting Terbaru</span>
            </h3>
            <button
              onClick={() => onNavigate('accounts')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Lihat Semua
            </button>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Domain</th>
                  <th className="py-2.5 px-3">Pemilik</th>
                  <th className="py-2.5 px-3">Paket</th>
                  <th className="py-2.5 px-3 text-center">cPanel</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {(data?.recentAccounts || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                      Tidak ada akun hosting ditemukan.
                    </td>
                  </tr>
                ) : (
                  (data?.recentAccounts || []).map((acc: any) => (
                    <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        <button
                          onClick={() => onNavigate('accounts')}
                          className="hover:text-blue-400 hover:underline text-left"
                        >
                          {acc.domain}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">
                        {acc.customer_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">
                        {acc.package_name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onNavigate('accounts')}
                          className="px-2 py-0.5 bg-orange-600/90 hover:bg-orange-500 text-white rounded text-[10px] font-bold shadow-sm"
                          title="Buka cPanel"
                        >
                          cPanel
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <StatusBadge status={acc.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices / Audit */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Faktur Tagihan Terakhir</span>
            </h3>
            <button
              onClick={() => onNavigate('billing')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Lihat Semua
            </button>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">No. Tagihan</th>
                  <th className="py-2.5 px-3">Nama</th>
                  <th className="py-2.5 px-3 text-right">Jumlah</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {(data?.recentInvoices || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                      Tidak ada faktur tagihan ditemukan.
                    </td>
                  </tr>
                ) : (
                  (data?.recentInvoices || []).map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans truncate max-w-[120px]">
                        {inv.customer_name}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold tabular-nums">
                        Rp {inv.total_amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
