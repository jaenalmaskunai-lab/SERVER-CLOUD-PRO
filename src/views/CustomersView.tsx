import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  UserCheck,
  Plus,
  Search,
  Ban,
  CheckCircle,
  HardDrive,
  Mail,
  Building2,
  Lock
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Customer Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('CustomerPro2026!');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/customers');
      setCustomers(data);
    } catch (err: any) {
      showToast('Gagal memuat pelanggan', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [user?.role, user?.id]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName,
          phone,
          company
        })
      });

      showToast('Pelanggan Terdaftar', `Akun ${username} siap digunakan.`, 'success');
      setIsCreateOpen(false);
      setUsername('');
      setEmail('');
      setFullName('');
      fetchCustomers();
    } catch (err: any) {
      showToast('Gagal mendaftarkan pelanggan', err.message, 'danger');
    }
  };

  const handleToggleStatus = async (customer: any) => {
    const action = customer.status === 'active' ? 'suspend' : 'aktifkan';
    if (!confirm(`Konfirmasi untuk ${action} pelanggan "${customer.full_name}"? Seluruh akun hosting miliknya akan disesuaikan.`)) return;

    try {
      const res = await apiRequest(`/api/customers/${customer.id}/toggle-status`, { method: 'POST' });
      showToast('Status Pelanggan Diperbarui', `Status saat ini: ${res.status}`, 'info');
      fetchCustomers();
    } catch (err: any) {
      showToast('Gagal mengubah status', err.message, 'danger');
    }
  };

  const filtered = customers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            <span>Manajemen Pelanggan Hosting</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola profil pelanggan, akses login client area, serta paket hosting yang sedang aktif.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, email, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 w-56"
            />
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Customers Data Grid */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Kontak & Perusahaan</th>
                <th className="py-3 px-4">Mitra Reseller</th>
                <th className="py-3 px-4 text-center">Akun Host Aktif</th>
                <th className="py-3 px-4 text-right">Penyimpanan Digunakan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    {loading ? 'Memuat pelanggan...' : 'Tidak ada data pelanggan yang sesuai.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name & Username */}
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-white text-sm">{c.full_name}</div>
                      <div className="text-[11px] text-blue-400 font-mono">@{c.username}</div>
                    </td>

                    {/* Email & Phone */}
                    <td className="py-3 px-4 font-sans">
                      <div className="text-slate-300 font-mono text-[11px]">{c.email}</div>
                      <div className="text-[11px] text-slate-400">{c.phone || c.company || '--'}</div>
                    </td>

                    {/* Reseller */}
                    <td className="py-3 px-4 font-sans">
                      <div className="text-slate-300 font-medium">
                        {c.reseller_brand || c.reseller_name || 'Direct Root Provider'}
                      </div>
                    </td>

                    {/* Active Host Accounts */}
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="font-bold text-white text-sm font-mono tabular-nums">{c.total_accounts}</span>
                      <span className="text-slate-400 text-xs ml-1">Akun</span>
                    </td>

                    {/* Disk Used */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {(c.total_disk_used_mb / 1024).toFixed(1)} GB
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center font-sans">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          c.status === 'active'
                            ? 'bg-slate-800 hover:bg-amber-950/60 text-slate-400 hover:text-amber-400'
                            : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-400'
                        }`}
                        title={c.status === 'active' ? 'Suspend Akun' : 'Aktifkan Akun'}
                      >
                        {c.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Customer */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Daftarkan Pelanggan Hosting Baru"
          subtitle="Pelanggan akan dapat masuk ke cPanel client area mandiri untuk mengelola domain dan website mereka"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Ahmad Fauzi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Perusahaan / Bisnis</label>
                <input
                  type="text"
                  placeholder="Toko Baju Online"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  placeholder="ahmad_dev"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Alamat Email *</label>
                <input
                  type="email"
                  required
                  placeholder="ahmad@tokobajuonline.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kata Sandi Awal *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  placeholder="+6285211223344"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
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
                Daftarkan Pelanggan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
