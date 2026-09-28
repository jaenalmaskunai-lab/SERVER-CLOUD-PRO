import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { HostingAccount, HostingPackage } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  HardDrive,
  FolderOpen,
  Globe2,
  Database,
  Mail,
  Code,
  ShieldCheck,
  RotateCcw,
  Ban,
  CheckCircle,
  Trash2,
  Plus,
  Search,
  ExternalLink,
  Sparkles,
  Key,
  Layers,
  ArrowUpRight,
  UserCheck,
  Cpu,
  Sliders,
  Terminal,
  Activity
} from 'lucide-react';

// Modals
import { FileManagerModal } from '../components/modals/FileManagerModal';
import { DnsEditorModal } from '../components/modals/DnsEditorModal';
import { DatabaseManagerModal } from '../components/modals/DatabaseManagerModal';
import { EmailManagerModal } from '../components/modals/EmailManagerModal';
import { PhpSelectorModal } from '../components/modals/PhpSelectorModal';
import { BackupRestoreModal } from '../components/modals/BackupRestoreModal';
import { CreateAccountModal } from '../components/modals/CreateAccountModal';
import { CPanelDashboardModal } from '../components/modals/CPanelDashboardModal';
import { Modal } from '../components/common/Modal';

export const AccountsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [packages, setPackages] = useState<HostingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [activeAccount, setActiveAccount] = useState<HostingAccount | null>(null);

  const [isCPanelOpen, setIsCPanelOpen] = useState(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isDnsOpen, setIsDnsOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isPhpOpen, setIsPhpOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // WHM Package Change & Reset Password Modal states
  const [isChangePkgOpen, setIsChangePkgOpen] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [updatingPkg, setUpdatingPkg] = useState(false);

  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [newPassInput, setNewPassInput] = useState('NewPassSecure2026!');
  const [resettingPass, setResettingPass] = useState(false);

  const role = user?.role || 'admin';
  const isCustomer = role === 'customer';
  const isReseller = role === 'reseller';

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const [accData, pkgData] = await Promise.all([
        apiRequest<HostingAccount[]>('/api/accounts'),
        apiRequest<HostingPackage[]>('/api/packages')
      ]);
      setAccounts(accData);
      setPackages(pkgData);
    } catch (err: any) {
      showToast('Gagal memuat akun hosting', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user?.role, user?.id]);

  const handleToggleStatus = async (account: HostingAccount) => {
    const action = account.status === 'active' ? 'suspend' : 'aktifkan';
    if (!confirm(`Konfirmasi untuk ${action} akun hosting untuk domain "${account.domain}"?`)) return;

    try {
      const res = await apiRequest<{ success: boolean; status: string }>(`/api/accounts/${account.id}/toggle-status`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Dikelola melalui WHM Account Manager' })
      });
      showToast(`Status Akun Diubah`, `Domain ${account.domain} sekarang ${res.status}.`, 'info');
      fetchAccounts();
    } catch (err: any) {
      showToast('Gagal mengubah status', err.message, 'danger');
    }
  };

  const handleDeleteAccount = async (account: HostingAccount) => {
    if (!confirm(`PERINGATAN: Hapus akun hosting "${account.domain}" beserta seluruh direktori /public_html, database MySQL, dan akun email? Tindakan ini permanen!`)) {
      return;
    }

    try {
      await apiRequest(`/api/accounts/${account.id}`, { method: 'DELETE' });
      showToast('Akun Dihapus', `Domain ${account.domain} telah diterminasi.`, 'info');
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      if (activeAccount?.id === account.id) {
        setIsCPanelOpen(false);
      }
    } catch (err: any) {
      showToast('Gagal menghapus akun', err.message, 'danger');
    }
  };

  const openCPanel = (account: HostingAccount) => {
    setActiveAccount(account);
    setIsCPanelOpen(true);
  };

  const openSubModal = (account: HostingAccount, modalType: 'files' | 'dns' | 'db' | 'email' | 'php' | 'backup') => {
    setActiveAccount(account);
    if (modalType === 'files') setIsFileManagerOpen(true);
    if (modalType === 'dns') setIsDnsOpen(true);
    if (modalType === 'db') setIsDatabaseOpen(true);
    if (modalType === 'email') setIsEmailOpen(true);
    if (modalType === 'php') setIsPhpOpen(true);
    if (modalType === 'backup') setIsBackupOpen(true);
  };

  // WHM: Change Package
  const handleChangePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount || !selectedPkgId) return;

    setUpdatingPkg(true);
    try {
      await apiRequest(`/api/accounts/${activeAccount.id}/change-package`, {
        method: 'POST',
        body: JSON.stringify({ package_id: Number(selectedPkgId) })
      });
      showToast('Paket Hosting Diperbarui', `Akun ${activeAccount.domain} berhasil dialihkan ke paket baru.`, 'success');
      setIsChangePkgOpen(false);
      fetchAccounts();
    } catch (err: any) {
      showToast('Gagal mengubah paket', err.message, 'danger');
    } finally {
      setUpdatingPkg(false);
    }
  };

  // WHM & cPanel: Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount || !newPassInput) return;

    setResettingPass(true);
    try {
      await apiRequest(`/api/accounts/${activeAccount.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassInput })
      });
      showToast('Password Diperbarui', `Password baru cPanel untuk ${activeAccount.domain} berhasil disimpan.`, 'success');
      setIsResetPassOpen(false);
    } catch (err: any) {
      showToast('Gagal mengubah password', err.message, 'danger');
    } finally {
      setResettingPass(false);
    }
  };

  const filtered = accounts.filter((a) =>
    a.domain.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase()) ||
    (a.customer_name && a.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  // Reseller calculations
  const totalDiskUsed = accounts.reduce((acc, curr) => acc + (curr.disk_used_mb || 0), 0);
  const totalBwUsed = accounts.reduce((acc, curr) => acc + (curr.bandwidth_used_mb || 0), 0);
  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const suspendedCount = accounts.filter((a) => a.status === 'suspended').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* WHM Reseller Pool Overview Banner (Visible for Reseller) */}
      {isReseller && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Website Dikelola</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{accounts.length} Akun</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">{activeCount} Aktif • {suspendedCount} Suspended</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Alokasi Disk NVMe Pool</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{(totalDiskUsed / 1024).toFixed(1)} GB</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Dari 100 GB Kuota Reseller</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Trafik Bandwidth Bulanan</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{(totalBwUsed / 1024).toFixed(1)} GB</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Batas Aman Tidak Terbatas</div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Provisi Akun Pelanggan (WHM)</span>
            </button>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <span>
              {isCustomer
                ? 'Website & Layanan Hosting Saya'
                : (isReseller ? 'Pusat Kontrol Hosting Pelanggan (WHM Manager)' : 'Manajemen Akun Hosting (Virtual Hosts)')}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isCustomer
              ? 'Kelola file website, database MySQL, akun email, AutoSSL Let\'s Encrypt, dan buka kontrol panel cPanel untuk setiap website Anda.'
              : 'Manajemen virtual host terpusat dengan fitur cPanel instan, alokasi paket, suspend/unsuspend, dan SSL Let\'s Encrypt.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari domain, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 w-56"
            />
          </div>

          {/* Create Button available to Customer, Reseller, and Admin */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>
              {isCustomer ? '+ Tambah Website Baru' : (isReseller ? '+ Provisi Akun Pelanggan' : 'Provisi Akun Baru')}
            </span>
          </button>
        </div>
      </div>

      {/* Accounts Data Grid */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Domain & Akun</th>
                {!isCustomer && <th className="py-3 px-4">Pemilik / Reseller</th>}
                <th className="py-3 px-4">Paket & Node</th>
                <th className="py-3 px-4">Penyimpanan NVMe</th>
                <th className="py-3 px-4 text-center">PHP & SSL</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Kontrol cPanel</th>
                <th className="py-3 px-4 text-right">Aksi Fitur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isCustomer ? 7 : 8} className="py-12 text-center text-slate-500 font-sans">
                    <div className="max-w-sm mx-auto space-y-3">
                      <p>{loading ? 'Memuat akun hosting...' : 'Belum ada website / akun hosting terdaftar.'}</p>
                      {!loading && (
                        <button
                          onClick={() => setIsCreateOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isCustomer ? 'Tambah Website Pertama Anda' : 'Provisi Akun Baru'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => {
                  const maxDisk = acc.package_disk_mb || 5120;
                  const diskPercent = Math.min(100, Math.round((acc.disk_used_mb / maxDisk) * 100));

                  return (
                    <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Domain & Username */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <button
                            onClick={() => openCPanel(acc)}
                            className="hover:text-blue-400 hover:underline transition-colors text-left font-bold"
                            title="Buka Pusat Kontrol cPanel"
                          >
                            {acc.domain}
                          </button>
                          <a
                            href={`https://${acc.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-blue-400"
                            title="Kunjungi Website"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                          cPanel User: <code className="text-blue-400 font-mono font-semibold">{acc.username}</code>
                        </div>
                      </td>

                      {/* Owner (Hidden for Customer) */}
                      {!isCustomer && (
                        <td className="py-3 px-4 font-sans">
                          <div className="text-slate-200 font-medium">{acc.customer_name || 'Pelanggan'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {acc.customer_email || 'customer@mail.com'}
                          </div>
                        </td>
                      )}

                      {/* Package & Node */}
                      <td className="py-3 px-4 font-sans">
                        <div className="text-slate-200 font-medium">{acc.package_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {acc.server_name || 'Node JKT'} ({acc.server_ip})
                        </div>
                      </td>

                      {/* Disk Progress */}
                      <td className="py-3 px-4">
                        <div className="w-32">
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono tabular-nums">
                            <span>{acc.disk_used_mb} MB</span>
                            <span>{maxDisk / 1024} GB</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                diskPercent > 85 ? 'bg-rose-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${diskPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* PHP & SSL */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                            PHP {acc.php_version}
                          </span>
                          <span
                            title={`SSL Let's Encrypt: ${acc.ssl_status}`}
                            className={`p-1 rounded text-[10px] flex items-center justify-center ${
                              acc.ssl_status === 'active'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center font-sans">
                        <StatusBadge status={acc.status} />
                        {acc.suspended_reason && (
                          <div className="text-[10px] text-rose-400 truncate max-w-[100px] mt-0.5">
                            {acc.suspended_reason}
                          </div>
                        )}
                      </td>

                      {/* Dedicated Prominent cPanel Button */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openCPanel(acc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all transform hover:scale-105"
                          title="Buka Pusat Kontrol cPanel Lengkap"
                        >
                          <span className="font-black text-[11px] tracking-tight">cP</span>
                          <span>Buka cPanel</span>
                        </button>
                      </td>

                      {/* Service Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openSubModal(acc, 'files')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="File Manager (/public_html)"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                          <button
                            onClick={() => openSubModal(acc, 'db')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Database MySQL"
                          >
                            <Database className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button
                            onClick={() => openSubModal(acc, 'dns')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="DNS Zone Editor"
                          >
                            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            onClick={() => openSubModal(acc, 'email')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Akun Email & Webmail"
                          >
                            <Mail className="w-3.5 h-3.5 text-purple-400" />
                          </button>
                          <button
                            onClick={() => openSubModal(acc, 'php')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="PHP Selector"
                          >
                            <Code className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          {/* WHM Controls for Reseller & Admin */}
                          {!isCustomer && (
                            <>
                              <button
                                onClick={() => {
                                  setActiveAccount(acc);
                                  setSelectedPkgId(String(acc.package_id));
                                  setIsChangePkgOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-950 text-slate-400 hover:text-blue-400 transition-colors"
                                title="Ubah / Upgrade Paket Hosting (WHM)"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setActiveAccount(acc);
                                  setNewPassInput('SecurePass2026!');
                                  setIsResetPassOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-950 text-slate-400 hover:text-amber-400 transition-colors"
                                title="Reset Password cPanel (WHM)"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(acc)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  acc.status === 'active'
                                    ? 'bg-slate-800 hover:bg-amber-950/60 text-slate-400 hover:text-amber-400'
                                    : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-400'
                                }`}
                                title={acc.status === 'active' ? 'Suspend Akun (WHM)' : 'Aktifkan Akun (WHM)'}
                              >
                                {acc.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(acc)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Terminasi Akun Permanen (WHM)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Render cPanel Comprehensive Suite Modal */}
      {activeAccount && isCPanelOpen && (
        <CPanelDashboardModal
          isOpen={isCPanelOpen}
          onClose={() => setIsCPanelOpen(false)}
          account={activeAccount}
          onOpenSubModal={(type) => openSubModal(activeAccount, type)}
          onRefreshAccount={fetchAccounts}
        />
      )}

      {/* Render Sub-Modals */}
      {activeAccount && isFileManagerOpen && (
        <FileManagerModal
          isOpen={isFileManagerOpen}
          onClose={() => setIsFileManagerOpen(false)}
          accountId={activeAccount.id}
          domain={activeAccount.domain}
        />
      )}

      {activeAccount && isDnsOpen && (
        <DnsEditorModal
          isOpen={isDnsOpen}
          onClose={() => setIsDnsOpen(false)}
          accountId={activeAccount.id}
          domain={activeAccount.domain}
        />
      )}

      {activeAccount && isDatabaseOpen && (
        <DatabaseManagerModal
          isOpen={isDatabaseOpen}
          onClose={() => setIsDatabaseOpen(false)}
          accountId={activeAccount.id}
          domain={activeAccount.domain}
          username={activeAccount.username}
        />
      )}

      {activeAccount && isEmailOpen && (
        <EmailManagerModal
          isOpen={isEmailOpen}
          onClose={() => setIsEmailOpen(false)}
          accountId={activeAccount.id}
          domain={activeAccount.domain}
        />
      )}

      {activeAccount && isPhpOpen && (
        <PhpSelectorModal
          isOpen={isPhpOpen}
          onClose={() => setIsPhpOpen(false)}
          accountId={activeAccount.id}
          domain={activeAccount.domain}
          currentVersion={activeAccount.php_version}
          onUpdated={() => fetchAccounts()}
        />
      )}

      {activeAccount && isBackupOpen && (
        <BackupRestoreModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
          accountId={activeAccount.id}
          domain={activeAccount.domain}
        />
      )}

      {/* Provisi / Tambah Website Modal */}
      {isCreateOpen && (
        <CreateAccountModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={fetchAccounts}
        />
      )}

      {/* WHM Modal: Ubah / Upgrade Paket Hosting */}
      {isChangePkgOpen && activeAccount && (
        <Modal
          isOpen={isChangePkgOpen}
          onClose={() => setIsChangePkgOpen(false)}
          title={`Ubah Paket Hosting (WHM) - ${activeAccount.domain}`}
          subtitle="Tingkatkan atau turunkan spesifikasi kuota disk NVMe, bandwidth, dan limit database."
          maxWidth="md"
        >
          <form onSubmit={handleChangePackageSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Pilih Paket Baru:
              </label>
              <select
                value={selectedPkgId}
                onChange={(e) => setSelectedPkgId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.disk_mb / 1024} GB NVMe, Rp {p.price_monthly.toLocaleString('id-ID')}/bln)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsChangePkgOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={updatingPkg}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
              >
                {updatingPkg ? 'Memperbarui...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* WHM & cPanel Modal: Reset Password */}
      {isResetPassOpen && activeAccount && (
        <Modal
          isOpen={isResetPassOpen}
          onClose={() => setIsResetPassOpen(false)}
          title={`Reset Password cPanel - ${activeAccount.domain}`}
          subtitle={`Ubah kata sandi login cPanel & FTP untuk user: ${activeAccount.username}`}
          maxWidth="md"
        >
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kata Sandi Baru:
              </label>
              <input
                type="text"
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetPassOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={resettingPass}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
              >
                {resettingPass ? 'Menyimpan...' : 'Perbarui Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
