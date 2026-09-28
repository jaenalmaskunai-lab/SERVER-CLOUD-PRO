import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { AuditLog, ApiKeyItem, FirewallRule } from '../types';
import { Modal } from '../components/common/Modal';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Lock,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  Filter
} from 'lucide-react';

export const SecurityView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState<'audit' | 'firewall' | 'api-keys'>('audit');

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchAudit, setSearchAudit] = useState('');

  // New API Key Modal
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read', 'provision', 'billing']);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);

  // New Firewall Rule Modal
  const [isFirewallOpen, setIsFirewallOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [firewallType, setFirewallType] = useState<'blacklist' | 'whitelist'>('blacklist');
  const [firewallNote, setFirewallNote] = useState('');

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [logs, keys] = await Promise.all([
        apiRequest<AuditLog[]>('/api/security/audit-logs'),
        apiRequest<ApiKeyItem[]>('/api/security/api-keys')
      ]);
      setAuditLogs(logs);
      setApiKeys(keys);

      if (user?.role === 'admin') {
        const fw = await apiRequest<FirewallRule[]>('/api/security/firewall');
        setFirewallRules(fw);
      }
    } catch (err: any) {
      showToast('Gagal memuat data keamanan', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [user?.role, user?.id]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      const res = await apiRequest<{ success: boolean; apiKey: string }>('/api/security/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          key_name: keyName.trim(),
          scopes,
          rate_limit: 120
        })
      });

      setCreatedApiKey(res.apiKey);
      showToast('API Key Berhasil Dibuat', 'Salin kunci ini sekarang karena tidak akan ditampilkan lagi.', 'success');
      fetchSecurityData();
    } catch (err: any) {
      showToast('Gagal membuat API key', err.message, 'danger');
    }
  };

  const handleRevokeApiKey = async (id: number) => {
    if (!confirm('Cabut API key ini? Integrasi yang menggunakannya akan langsung kehilangan akses.')) return;
    try {
      await apiRequest(`/api/security/api-keys/${id}`, { method: 'DELETE' });
      showToast('API Key Dicabut', '', 'info');
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err: any) {
      showToast('Gagal mencabut key', err.message, 'danger');
    }
  };

  const handleAddFirewall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;

    try {
      await apiRequest('/api/security/firewall', {
        method: 'POST',
        body: JSON.stringify({
          ip_address: ipAddress.trim(),
          type: firewallType,
          note: firewallNote.trim()
        })
      });

      showToast('Aturan Firewall Ditambahkan', `${ipAddress} (${firewallType})`, 'success');
      setIsFirewallOpen(false);
      setIpAddress('');
      setFirewallNote('');
      fetchSecurityData();
    } catch (err: any) {
      showToast('Gagal menambah aturan firewall', err.message, 'danger');
    }
  };

  const handleDeleteFirewall = async (id: number) => {
    try {
      await apiRequest(`/api/security/firewall/${id}`, { method: 'DELETE' });
      showToast('Aturan Firewall Dihapus', '', 'info');
      setFirewallRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      showToast('Gagal menghapus aturan firewall', err.message, 'danger');
    }
  };

  const filteredLogs = auditLogs.filter((log) =>
    log.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
    log.ip_address.includes(searchAudit) ||
    (log.details && log.details.toLowerCase().includes(searchAudit.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Pusat Keamanan, Audit Log & Proteksi Firewall</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pencatatan jejak audit aktivitas yang tidak dapat diubah (immutable), daftar IP Whitelist/Blacklist, dan otentikasi API Key terproteksi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'api-keys' && (
            <button
              onClick={() => {
                setIsApiKeyOpen(true);
                setCreatedApiKey(null);
                setKeyName('');
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Generate API Key</span>
            </button>
          )}

          {activeTab === 'firewall' && user?.role === 'admin' && (
            <button
              onClick={() => setIsFirewallOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aturan IP</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'audit'
              ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Audit Trail Log ({auditLogs.length})
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('firewall')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'firewall'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            IP Firewall ({firewallRules.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('api-keys')}
          className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'api-keys'
              ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          API Keys Integrasi ({apiKeys.length})
        </button>
      </div>

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari aksi, IP address, detail..."
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Menampilkan {filteredLogs.length} entri riwayat
            </div>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Pelaku (Peran)</th>
                  <th className="py-3 px-4">Tindakan / Aksi</th>
                  <th className="py-3 px-4">Alamat IP</th>
                  <th className="py-3 px-4">Detail Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                      Tidak ada entri log audit yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="font-semibold text-white">{log.full_name || 'System Actor'}</span>
                        <span className="text-[10px] text-blue-400 uppercase ml-1.5 font-mono font-bold">
                          [{log.user_role}]
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.ip_address}
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-xs font-sans text-xs">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Firewall Rules Tab */}
      {activeTab === 'firewall' && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Alamat IP / Subnet</th>
                <th className="py-3 px-4">Tipe Aturan</th>
                <th className="py-3 px-4">Catatan Alasan</th>
                <th className="py-3 px-4 text-center">Waktu Ditambahkan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {firewallRules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                    Tidak ada aturan firewall kustom.
                  </td>
                </tr>
              ) : (
                firewallRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white text-sm">
                      {rule.ip_address}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          rule.type === 'whitelist'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                            : 'bg-rose-950/60 text-rose-400 border-rose-800'
                        }`}
                      >
                        {rule.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {rule.note}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                      {new Date(rule.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteFirewall(rule.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Hapus Aturan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="space-y-4">
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Label Kunci</th>
                  <th className="py-3 px-4">Awalan Token API</th>
                  <th className="py-3 px-4">Hak Akses (Scopes)</th>
                  <th className="py-3 px-4 text-center">Batas Rate</th>
                  <th className="py-3 px-4 text-center">Dibuat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      Belum ada API key dibuat. Klik "Generate API Key" di atas untuk menghubungkan billing automation atau WHMCS.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white font-sans">
                        {k.key_name}
                      </td>
                      <td className="py-3 px-4 text-blue-400">
                        {k.api_key.substring(0, 16)}...
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 tabular-nums">
                        {k.rate_limit_per_min} req/menit
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                        {new Date(k.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRevokeApiKey(k.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Cabut API Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Generate API Key */}
      {isApiKeyOpen && (
        <Modal
          isOpen={isApiKeyOpen}
          onClose={() => setIsApiKeyOpen(false)}
          title="Generate API Key Baru"
          subtitle="Gunakan API key ini untuk mengotentikasi REST API Cloud PRO secara terprogram"
          maxWidth="md"
        >
          {createdApiKey ? (
            <div className="space-y-4 py-2 animate-fadeIn">
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-200">
                <div className="font-semibold text-emerald-300">API Key Berhasil Diterbitkan:</div>
                <div className="mt-2 p-2 bg-slate-950 rounded border border-emerald-900 font-mono text-[11px] break-all select-all text-white">
                  {createdApiKey}
                </div>
                <p className="mt-2 text-[11px] text-emerald-300/80">
                  Simpan sekarang di tempat aman. Demi alasan keamanan, token ini tidak dapat ditampilkan kembali.
                </p>
              </div>
              <button
                onClick={() => setIsApiKeyOpen(false)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
              >
                Saya Telah Menyimpan Kunci Ini
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama / Label Kunci *
                </label>
                <input
                  type="text"
                  required
                  placeholder="WHMCS Billing Module"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cakupan Izin (Scopes)
                </label>
                <div className="space-y-1.5 text-xs text-slate-300">
                  {['read', 'provision', 'billing', 'dns', 'servers'].map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopes.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked) setScopes([...scopes, s]);
                          else setScopes(scopes.filter((item) => item !== s));
                        }}
                      />
                      <span className="font-mono">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsApiKeyOpen(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                >
                  Buat API Key
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Modal: Add Firewall Rule */}
      {isFirewallOpen && (
        <Modal
          isOpen={isFirewallOpen}
          onClose={() => setIsFirewallOpen(false)}
          title="Tambah Aturan Firewall IP"
          subtitle="Terapkan pemblokiran atau pengecualian IP address pada tingkat cluster"
          maxWidth="md"
        >
          <form onSubmit={handleAddFirewall} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Alamat IP atau CIDR Subnet *
              </label>
              <input
                type="text"
                required
                placeholder="45.143.203.11 atau 103.145.226.0/24"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tindakan Aturan
              </label>
              <select
                value={firewallType}
                onChange={(e) => setFirewallType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="blacklist">Blacklist (Blokir Total Sinyal Masuk)</option>
                <option value="whitelist">Whitelist (Izinkan Melewati Proteksi Rate-limit)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Catatan Alasan
              </label>
              <input
                type="text"
                placeholder="misal: Terdeteksi upaya brute-force SSH port 22"
                value={firewallNote}
                onChange={(e) => setFirewallNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFirewallOpen(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium"
              >
                Terapkan Aturan IP
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
