import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { User, HostingPackage, ServerNode } from '../../types';
import { Plus, ShieldCheck, Sparkles, UserPlus, Globe2, HardDrive, Key, UserCheck } from 'lucide-react';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [customers, setCustomers] = useState<User[]>([]);
  const [packages, setPackages] = useState<HostingPackage[]>([]);
  const [servers, setServers] = useState<ServerNode[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isCustomer = user?.role === 'customer';
  const isReseller = user?.role === 'reseller';
  const isAdmin = user?.role === 'admin';

  // Toggle for reseller: quick create new customer on the fly
  const [createNewCustomer, setCreateNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Form fields
  const [customerId, setCustomerId] = useState('');
  const [domain, setDomain] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('SecureHost2026!');
  const [packageId, setPackageId] = useState('');
  const [serverId, setServerId] = useState('');
  const [phpVersion, setPhpVersion] = useState('8.3');
  const [autoInstallWp, setAutoInstallWp] = useState(false);
  const [siteTitle, setSiteTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          // Packages can be fetched by all roles
          const pList = await apiRequest<HostingPackage[]>('/api/packages');
          setPackages(pList);
          if (pList.length > 0) setPackageId(String(pList[0].id));

          // Customers and Servers only fetched by admin or reseller
          if (!isCustomer) {
            try {
              const cList = await apiRequest<User[]>('/api/customers');
              setCustomers(cList);
              if (cList.length > 0) setCustomerId(String(cList[0].id));
            } catch (cErr) {
              console.warn('Customer list not accessible', cErr);
            }
          }

          if (isAdmin) {
            try {
              const sList = await apiRequest<ServerNode[]>('/api/servers');
              setServers(sList);
              if (sList.length > 0) setServerId(String(sList[0].id));
            } catch (sErr) {
              console.warn('Server list not accessible', sErr);
            }
          }
        } catch (err: any) {
          showToast('Gagal memuat opsi form', err.message, 'danger');
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isOpen, user?.role]);

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '');
    setDomain(val);
    const suggestedUser = val.split('.')[0].replace(/[^a-z0-9]/g, '').substring(0, 10);
    if (!username || username === suggestedUser.substring(0, username.length)) {
      setUsername(suggestedUser);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim() || !username.trim() || !packageId) {
      showToast('Form tidak lengkap', 'Harap lengkapi nama domain, username cPanel, dan pilihan paket.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      let finalCustomerId = isCustomer ? user?.id : Number(customerId);

      // If reseller checked "Daftarkan Pelanggan Baru Sekaligus"
      if (!isCustomer && createNewCustomer) {
        if (!newCustName.trim() || !newCustEmail.trim()) {
          showToast('Data Pelanggan Belum Lengkap', 'Nama dan Email pelanggan baru wajib diisi.', 'warning');
          setSubmitting(false);
          return;
        }

        const generatedCustUser = newCustEmail.split('@')[0].replace(/[^a-z0-9]/g, '').substring(0, 10) + Math.floor(10 + Math.random() * 90);
        const custRes = await apiRequest<{ customer: User }>('/api/customers', {
          method: 'POST',
          body: JSON.stringify({
            username: generatedCustUser,
            email: newCustEmail.trim(),
            password: 'CustomerPass2026!',
            full_name: newCustName.trim(),
            phone: newCustPhone.trim()
          })
        });
        finalCustomerId = custRes.customer.id;
      }

      await apiRequest('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: finalCustomerId,
          package_id: Number(packageId),
          server_id: Number(serverId) || 1,
          domain: domain.trim(),
          username: username.trim(),
          password,
          php_version: phpVersion,
          install_app: autoInstallWp ? 'wordpress' : null,
          app_title: siteTitle || domain.trim(),
          admin_user: username.trim(),
          admin_pass: password
        })
      });

      showToast(
        'Website Berhasil Ditambahkan!',
        `Domain ${domain} telah aktif dengan SSL Let's Encrypt gratis dan fitur cPanel lengkap.`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Gagal memprovisi website', err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = isCustomer
    ? 'Tambah Website Baru (Order Hosting)'
    : (isReseller ? 'Provisi Akun Hosting Pelanggan (WHM)' : 'Provisi VirtualHost Root cPanel');

  const modalSubtitle = isCustomer
    ? 'Daftarkan domain website Anda. Sistem otomatis membuat virtual host, sertifikat SSL Let\'s Encrypt, dan akun cPanel siap pakai.'
    : 'Buat akun hosting virtualhost cPanel baru untuk pelanggan Anda dari kuota pool reseller.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Reseller / Admin: Customer Selector */}
        {!isCustomer && (
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span>Pemilik Akun Hosting (Pelanggan) *</span>
              </label>

              {isReseller && (
                <button
                  type="button"
                  onClick={() => setCreateNewCustomer(!createNewCustomer)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{createNewCustomer ? 'Pilih Pelanggan Terdaftar' : '+ Daftarkan Pelanggan Baru Sekaligus'}</span>
                </button>
              )}
            </div>

            {createNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <input
                    type="text"
                    placeholder="Nama Lengkap Pelanggan"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email Pelanggan"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="No. WhatsApp / HP"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {customers.length === 0 ? (
                  <option value="">(Belum ada pelanggan, silakan buat pelanggan baru)</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.email})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        )}

        {/* Customer Self Information Banner */}
        {isCustomer && (
          <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-xs text-blue-300 flex items-center justify-between">
            <div>
              Pemilik Website: <strong className="text-white">{user?.full_name}</strong> ({user?.email})
            </div>
            <div className="font-mono text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              Saldo Aktif: Rp {user?.balance?.toLocaleString('id-ID') || 0}
            </div>
          </div>
        )}

        {/* Website & cPanel Core Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Domain Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Nama Domain Utama *</span>
            </label>
            <input
              type="text"
              placeholder="contoh: tokobaru.com atau blog.my.id"
              value={domain}
              onChange={handleDomainChange}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Hosting Package */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              <span>Paket Hosting *</span>
            </label>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - Rp {p.price_monthly.toLocaleString('id-ID')}/bln ({p.disk_mb / 1024} GB NVMe)
                </option>
              ))}
            </select>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Username cPanel / SFTP *
            </label>
            <input
              type="text"
              placeholder="maks 10 karakter"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Password cPanel & MySQL *</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* PHP Version */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Versi PHP Default
            </label>
            <select
              value={phpVersion}
              onChange={(e) => setPhpVersion(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="8.4">PHP 8.4 (Latest)</option>
              <option value="8.3">PHP 8.3 (Recommended)</option>
              <option value="8.2">PHP 8.2</option>
              <option value="8.1">PHP 8.1</option>
              <option value="7.4">PHP 7.4 (Legacy)</option>
            </select>
          </div>

          {/* Admin Server Node Selector (Only for Admin) */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Server Node Target (Admin Only)
              </label>
              <select
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.ip_address}) - {s.location}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 1-Click WordPress Auto Installer Checkbox */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoInstallWp}
              onChange={(e) => setAutoInstallWp(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
            />
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Instal CMS WordPress Otomatis (Softaculous 1-Click)</span>
            </div>
          </label>

          {autoInstallWp && (
            <div className="pl-6 pt-1">
              <input
                type="text"
                placeholder="Judul Website (misal: Portal Berita / Toko Online)"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                WordPress versi terbaru akan langsung terpasang di direktori <code>/public_html</code> dengan login admin sesuai kredensial cPanel di atas.
              </p>
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-200 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-relaxed">
            Sertifikat SSL Let's Encrypt Wildcard otomatis aktif. Zona DNS standar, database MySQL awal, dan File Manager cPanel langsung siap digunakan setelah provisi.
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || loadingData}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>{submitting ? 'Memprovisi Server...' : (isCustomer ? 'Buat Website Sekarang' : 'Provisi Akun Hosting (WHM)')}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
