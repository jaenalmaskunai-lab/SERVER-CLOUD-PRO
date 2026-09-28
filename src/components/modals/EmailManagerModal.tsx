import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { Mail, Plus, Trash2, Send, ExternalLink, Forward } from 'lucide-react';
import { EmailItem } from '../../types';

interface EmailManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  domain: string;
}

export const EmailManagerModal: React.FC<EmailManagerModalProps> = ({
  isOpen,
  onClose,
  accountId,
  domain
}) => {
  const { showToast } = useNotification();
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New Email form
  const [isAdding, setIsAdding] = useState(false);
  const [emailPrefix, setEmailPrefix] = useState('');
  const [quotaMb, setQuotaMb] = useState('1024');
  const [forwardTo, setForwardTo] = useState('');

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<EmailItem[]>(`/api/emails?account_id=${accountId}`);
      setEmails(data);
    } catch (err: any) {
      showToast('Gagal memuat email', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accountId) {
      loadEmails();
      setIsAdding(false);
    }
  }, [isOpen, accountId]);

  const handleCreateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailPrefix.trim()) return;

    try {
      await apiRequest('/api/emails', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          email_prefix: emailPrefix.trim(),
          quota_mb: Number(quotaMb) || 1024,
          forward_to: forwardTo.trim()
        })
      });

      showToast('Akun Email Berhasil Dibuat', `${emailPrefix}@${domain}`, 'success');
      setEmailPrefix('');
      setForwardTo('');
      setIsAdding(false);
      loadEmails();
    } catch (err: any) {
      showToast('Gagal membuat email', err.message, 'danger');
    }
  };

  const handleDeleteEmail = async (id: number, email: string) => {
    if (!confirm(`Hapus akun email "${email}" beserta seluruh pesan di dalamnya?`)) return;

    try {
      await apiRequest(`/api/emails/${id}`, { method: 'DELETE' });
      showToast('Email Dihapus', email, 'info');
      setEmails((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      showToast('Gagal menghapus email', err.message, 'danger');
    }
  };

  const handleOpenWebmail = (email: string) => {
    showToast('Roundcube Webmail', `Membuka sesi webmail untuk ${email}...`, 'info');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Email Hosting (Roundcube/Webmail) - ${domain}`}
      subtitle={`Kelola akun surat elektronik kustom pada @${domain}`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <span>MTA: <strong>Postfix + Dovecot IMAP/SMTP</strong></span>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Akun Email</span>
          </button>
        </div>

        {/* Add Email Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateEmail}
            className="p-4 bg-slate-950 border border-blue-500/40 rounded-xl space-y-3 animate-fadeIn"
          >
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Buat Alamat Email Baru
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Alamat Email
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="kontak, support, admin"
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                    required
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-r-0 border-slate-700 rounded-l-md text-xs text-white focus:outline-none"
                  />
                  <span className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-r-md text-xs font-mono text-slate-400">
                    @{domain}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Kuota Penyimpanan (MB)
                </label>
                <select
                  value={quotaMb}
                  onChange={(e) => setQuotaMb(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-white focus:outline-none"
                >
                  <option value="512">512 MB</option>
                  <option value="1024">1024 MB (1 GB)</option>
                  <option value="2048">2048 MB (2 GB)</option>
                  <option value="5120">5120 MB (5 GB)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Forward Otomatis (Opsional)
                </label>
                <input
                  type="email"
                  placeholder="contoh: emailpribadi@gmail.com"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-sm"
              >
                Buat Akun Email
              </button>
            </div>
          </form>
        )}

        {/* Email Accounts Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Alamat Email</th>
                <th className="py-2.5 px-4">Penggunaan Kuota</th>
                <th className="py-2.5 px-4">Forwarder</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                    Belum ada akun email terdaftar.
                  </td>
                </tr>
              ) : (
                emails.map((e) => {
                  const percent = Math.min(100, Math.round((e.used_mb / e.quota_mb) * 100));
                  return (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-200">
                        {e.email}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {e.used_mb} / {e.quota_mb} MB ({percent}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                        {e.forward_to ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Forward className="w-3 h-3 text-blue-400" />
                            <span>{e.forward_to}</span>
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenWebmail(e.email)}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded text-[11px] transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Webmail</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEmail(e.id, e.email)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Hapus Email"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
