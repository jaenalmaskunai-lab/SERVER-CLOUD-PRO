import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  Users2,
  Plus,
  Search,
  Wallet,
  Ban,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

export const ResellersView: React.FC = () => {
  const { showToast } = useNotification();
  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [balanceModalReseller, setBalanceModalReseller] = useState<any>(null);
  const [balanceAmount, setBalanceAmount] = useState('2000000');
  const [balanceNote, setBalanceNote] = useState('');

  // Create Reseller form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('ResellerPro2026!');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [brandName, setBrandName] = useState('');
  const [initialBalance, setInitialBalance] = useState('5000000');

  const fetchResellers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/resellers');
      setResellers(data);
    } catch (err: any) {
      showToast('Gagal memuat daftar reseller', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  const handleCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/resellers', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName,
          phone,
          company,
          brand_name: brandName,
          initial_balance: Number(initialBalance)
        })
      });

      showToast('Reseller Berhasil Didaftarkan', `Akun ${username} siap digunakan.`, 'success');
      setIsCreateOpen(false);
      fetchResellers();
    } catch (err: any) {
      showToast('Gagal mendaftarkan reseller', err.message, 'danger');
    }
  };

  const handleToggleStatus = async (reseller: any) => {
    const action = reseller.status === 'active' ? 'suspend' : 'aktifkan';
    if (!confirm(`Konfirmasi untuk ${action} reseller "${reseller.full_name}"? Penangguhan akan menghentikan seluruh akun pelanggan di bawah reseller ini.`)) {
      return;
    }

    try {
      const res = await apiRequest(`/api/resellers/${reseller.id}/toggle-status`, { method: 'POST' });
      showToast('Status Reseller Diperbarui', `Status saat ini: ${res.status}`, 'info');
      fetchResellers();
    } catch (err: any) {
      showToast('Gagal mengubah status', err.message, 'danger');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalReseller) return;

    try {
      await apiRequest(`/api/resellers/${balanceModalReseller.id}/balance`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(balanceAmount),
          description: balanceNote || 'Penyesuaian Saldo oleh Administrator'
        })
      });

      showToast('Saldo Reseller Diperbarui', `Penyesuaian saldo berhasil dicatat.`, 'success');
      setBalanceModalReseller(null);
      fetchResellers();
    } catch (err: any) {
      showToast('Gagal menyesuaikan saldo', err.message, 'danger');
    }
  };

  const filtered = resellers.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.username.toLowerCase().includes(search.toLowerCase()) ||
    (r.company && r.company.toLowerCase().includes(search.toLowerCase())) ||
    (r.brand_name && r.brand_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-400" />
            <span>Manajemen Reseller Hosting & Alokasi Quota</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola mitra reseller, batasan resource pool (disk, bandwidth, akun), saldo kredit, dan status tenant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari reseller, brand..."
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
            <span>Tambah Reseller</span>
          </button>
        </div>
      </div>

      {/* Reseller Cards / Table */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Mitra & Brand</th>
                <th className="py-3 px-4">Kontak & Domain Panel</th>
                <th className="py-3 px-4 text-center">Pelanggan & Akun</th>
                <th className="py-3 px-4 text-right">Saldo Kredit</th>
                <th className="py-3 px-4 text-right">Penyimpanan Terpakai</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    {loading ? 'Memuat reseller...' : 'Tidak ada reseller ditemukan.'}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name & Brand */}
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-white text-sm">{r.full_name}</div>
                      <div className="text-xs text-indigo-400 font-medium mt-0.5">
                        Brand: {r.brand_name || 'Cloud PRO Reseller'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">@{r.username}</div>
                    </td>

                    {/* Contact & Domain */}
                    <td className="py-3 px-4 font-sans">
                      <div className="text-slate-300 font-mono text-[11px]">{r.email}</div>
                      <div className="text-[11px] text-slate-400">{r.phone || r.company}</div>
                      {r.custom_domain && (
                        <div className="text-[11px] text-blue-400 font-mono mt-0.5 flex items-center gap-1">
                          <span>{r.custom_domain}</span>
                        </div>
                      )}
                    </td>

                    {/* Customers & Accounts */}
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="font-bold text-white text-sm font-mono tabular-nums">{r.total_customers}</span>
                      <span className="text-slate-400 text-xs ml-1">Pelanggan</span>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {r.total_accounts} / 50 Akun Host
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-4 text-right font-mono">
                      <div className="text-emerald-400 font-bold text-sm tabular-nums">
                        Rp {r.balance.toLocaleString('id-ID')}
                      </div>
                      <button
                        onClick={() => {
                          setBalanceModalReseller(r);
                          setBalanceAmount('1000000');
                        }}
                        className="text-[11px] text-blue-400 hover:underline font-sans"
                      >
                        + Sesuaikan Saldo
                      </button>
                    </td>

                    {/* Disk Usage */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="text-slate-200">
                        {(r.total_disk_used_mb / 1024).toFixed(1)} GB
                      </div>
                      <div className="text-[10px] text-slate-400">
                        BW: {(r.total_bandwidth_used_mb / 1024).toFixed(1)} GB
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center font-sans">
                      <StatusBadge status={r.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            r.status === 'active'
                              ? 'bg-slate-800 hover:bg-amber-950/60 text-slate-400 hover:text-amber-400'
                              : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-400'
                          }`}
                          title={r.status === 'active' ? 'Suspend Reseller (Cascade)' : 'Aktifkan Reseller'}
                        >
                          {r.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Reseller */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Tambah Mitra Reseller Baru"
          subtitle="Reseller akan memiliki portal mandiri untuk mengelola pelanggan dan akun hosting mereka"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateReseller} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Hendra Wijaya"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Perusahaan / Organisasi</label>
                <input
                  type="text"
                  placeholder="PT Nusantara Cloud Solutions"
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
                  placeholder="reseller_hendra"
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
                  placeholder="billing@nusantaracloud.com"
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
                  placeholder="+6281234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nama Brand White Label</label>
                <input
                  type="text"
                  placeholder="Nusantara Cloud"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Saldo Deposit Awal (IDR)</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
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
                Daftarkan Reseller
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Adjust Balance */}
      {balanceModalReseller && (
        <Modal
          isOpen={Boolean(balanceModalReseller)}
          onClose={() => setBalanceModalReseller(null)}
          title={`Penyesuaian Saldo - ${balanceModalReseller.full_name}`}
          subtitle={`Saldo saat ini: Rp ${balanceModalReseller.balance.toLocaleString('id-ID')}`}
          maxWidth="md"
        >
          <form onSubmit={handleAdjustBalance} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nominal Penyesuaian (Gunakan tanda minus untuk pengurangan)
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-slate-800 border border-r-0 border-slate-700 rounded-l-lg text-xs text-slate-400 font-medium">
                  Rp
                </span>
                <input
                  type="number"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-r-lg text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Catatan Transaksi</label>
              <input
                type="text"
                placeholder="misal: Tambahan kredit promosi awal tahun"
                value={balanceNote}
                onChange={(e) => setBalanceNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBalanceModalReseller(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
              >
                Simpan Penyesuaian
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
