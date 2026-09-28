import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { HostingPackage } from '../types';
import { Modal } from '../components/common/Modal';
import {
  Package,
  Plus,
  Trash2,
  Check,
  HardDrive,
  Cpu,
  Globe2,
  Database,
  Mail,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export const PackagesView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [packages, setPackages] = useState<HostingPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Package Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [diskMb, setDiskMb] = useState('10240');
  const [bwMb, setBwMb] = useState('102400');
  const [cpuPercent, setCpuPercent] = useState('100');
  const [ramMb, setRamMb] = useState('1024');
  const [maxDomains, setMaxDomains] = useState('1');
  const [maxDbs, setMaxDbs] = useState('5');
  const [maxEmails, setMaxEmails] = useState('10');
  const [priceMonthly, setPriceMonthly] = useState('65000');
  const [priceAnnual, setPriceAnnual] = useState('650000');

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<HostingPackage[]>('/api/packages');
      setPackages(data);
    } catch (err: any) {
      showToast('Gagal memuat paket hosting', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [user?.role, user?.id]);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/packages', {
        method: 'POST',
        body: JSON.stringify({
          name,
          disk_mb: Number(diskMb),
          bandwidth_mb: Number(bwMb),
          cpu_percent: Number(cpuPercent),
          ram_mb: Number(ramMb),
          max_domains: Number(maxDomains),
          max_databases: Number(maxDbs),
          max_emails: Number(maxEmails),
          price_monthly: Number(priceMonthly),
          price_annual: Number(priceAnnual)
        })
      });

      showToast('Paket Hosting Dibuat', name, 'success');
      setIsCreateOpen(false);
      setName('');
      fetchPackages();
    } catch (err: any) {
      showToast('Gagal membuat paket', err.message, 'danger');
    }
  };

  const handleDeletePackage = async (id: number, pkgName: string) => {
    if (!confirm(`Hapus paket hosting "${pkgName}"?`)) return;
    try {
      await apiRequest(`/api/packages/${id}`, { method: 'DELETE' });
      showToast('Paket Dihapus', pkgName, 'info');
      fetchPackages();
    } catch (err: any) {
      showToast('Gagal menghapus paket', err.message, 'danger');
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'reseller';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span>Katalog Paket Hosting & Batas Resource</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {user?.role === 'reseller'
              ? 'Rancang paket hosting kustom untuk pelanggan Anda dengan harga dan batas resource fleksibel.'
              : 'Konfigurasi paket hosting global dan tingkatan tier server NVMe.'}
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Paket Hosting Baru</span>
          </button>
        )}
      </div>

      {/* Package Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm relative overflow-hidden"
          >
            <div>
              {/* Reseller tag if custom */}
              {pkg.reseller_name && (
                <span className="text-[10px] font-medium text-indigo-400 block mb-1">
                  Reseller: {pkg.reseller_name}
                </span>
              )}

              <div className="flex items-start justify-between">
                <h3 className="text-base font-bold text-white">{pkg.name}</h3>
                {canManage && (
                  <button
                    onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    title="Hapus Paket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Price */}
              <div className="mt-4 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-slate-400 font-sans">Rp</span>
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
                    {pkg.price_monthly.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-400 font-sans">/bulan</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Rp {pkg.price_annual.toLocaleString('id-ID')} /tahun
                </div>
              </div>

              {/* Feature Limits Matrix */}
              <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Storage: <strong className="text-white font-mono">{pkg.disk_mb / 1024} GB NVMe SSD</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Bandwidth: <strong className="text-white font-mono">{(pkg.bandwidth_mb / 1024).toFixed(0)} GB</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Domain & Subdomain: <strong className="text-white font-mono">{pkg.max_domains} Domain ({pkg.max_subdomains} Sub)</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Database MySQL: <strong className="text-white font-mono">{pkg.max_databases} DB</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    Akun Email: <strong className="text-white font-mono">{pkg.max_emails} Akun</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Gratis Let's Encrypt SSL Otomatis</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>1-Click Automated Backup & Restore</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{pkg.accounts_count || 0} Akun Terdaftar</span>
              <span className="font-mono text-emerald-400 font-semibold">Tersedia</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Package */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Rancang Paket Hosting Baru"
          subtitle="Tentukan batas kuota dan harga berlangganan"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreatePackage} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Paket *</label>
                <input
                  type="text"
                  required
                  placeholder="Paket Toko Online Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Penyimpanan NVMe (MB) *</label>
                <input
                  type="number"
                  required
                  value={diskMb}
                  onChange={(e) => setDiskMb(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bandwidth Bulanan (MB) *</label>
                <input
                  type="number"
                  required
                  value={bwMb}
                  onChange={(e) => setBwMb(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Maks. Domain Utama</label>
                <input
                  type="number"
                  value={maxDomains}
                  onChange={(e) => setMaxDomains(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Maks. Database MySQL</label>
                <input
                  type="number"
                  value={maxDbs}
                  onChange={(e) => setMaxDbs(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Maks. Akun Email</label>
                <input
                  type="number"
                  value={maxEmails}
                  onChange={(e) => setMaxEmails(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Harga Bulanan (IDR)</label>
                <input
                  type="number"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm"
              >
                Simpan Paket
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
