import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { Plus, Trash2, Globe, Shield, RefreshCw, Wand2 } from 'lucide-react';
import { DnsRecord } from '../../types';

interface DnsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  domain: string;
}

export const DnsEditorModal: React.FC<DnsEditorModalProps> = ({
  isOpen,
  onClose,
  accountId,
  domain
}) => {
  const { showToast } = useNotification();
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // New record form
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA'>('A');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [ttl, setTtl] = useState('3600');
  const [priority, setPriority] = useState('10');

  const loadZoneAndRecords = async () => {
    setLoading(true);
    try {
      const zones = await apiRequest<any[]>(`/api/dns/zones?account_id=${accountId}`);
      if (zones.length > 0) {
        setZoneId(zones[0].id);
        const data = await apiRequest<DnsRecord[]>(`/api/dns/zones/${zones[0].id}/records`);
        setRecords(data);
      }
    } catch (err: any) {
      showToast('Gagal memuat DNS Zone', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accountId) {
      loadZoneAndRecords();
      setIsAdding(false);
    }
  }, [isOpen, accountId]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneId || !name.trim() || !content.trim()) return;

    try {
      await apiRequest('/api/dns/records', {
        method: 'POST',
        body: JSON.stringify({
          zone_id: zoneId,
          type,
          name: name.trim(),
          content: content.trim(),
          ttl: Number(ttl) || 3600,
          priority: type === 'MX' ? Number(priority) : null
        })
      });

      showToast('DNS Record Ditambahkan', `${type} ${name}`, 'success');
      setName('');
      setContent('');
      setIsAdding(false);
      loadZoneAndRecords();
    } catch (err: any) {
      showToast('Gagal menambah record', err.message, 'danger');
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Hapus DNS record ini?')) return;
    try {
      await apiRequest(`/api/dns/records/${id}`, { method: 'DELETE' });
      showToast('DNS Record Dihapus', '', 'info');
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      showToast('Gagal menghapus record', err.message, 'danger');
    }
  };

  const handleApplyTemplate = async (templateName: string) => {
    if (!zoneId) return;
    if (!confirm(`Terapkan template '${templateName}'? Konfigurasi email/MX yang ada akan diperbarui.`)) return;

    try {
      const res = await apiRequest<{ success: boolean; records: DnsRecord[] }>(
        `/api/dns/zones/${zoneId}/apply-template`,
        {
          method: 'POST',
          body: JSON.stringify({ template: templateName })
        }
      );
      setRecords(res.records);
      showToast('Template Berhasil Diterapkan', `Template DNS ${templateName} telah disinkronkan.`, 'success');
    } catch (err: any) {
      showToast('Gagal menerapkan template', err.message, 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`DNS Zone Editor - ${domain}`}
      subtitle="Kelola DNS Records: A, AAAA, CNAME, MX, TXT, NS"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Templates & Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Template Cepat:</span>
            </span>
            <button
              onClick={() => handleApplyTemplate('google_workspace')}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
            >
              Google Workspace (GSuite)
            </button>
            <button
              onClick={() => handleApplyTemplate('microsoft_365')}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
            >
              Microsoft 365
            </button>
            <button
              onClick={() => handleApplyTemplate('cloudflare_proxy')}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
            >
              Cloudflare
            </button>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Record</span>
          </button>
        </div>

        {/* Add Record Form */}
        {isAdding && (
          <form
            onSubmit={handleAddRecord}
            className="p-4 bg-slate-950 border border-blue-500/40 rounded-xl grid grid-cols-1 sm:grid-cols-5 gap-3 animate-fadeIn"
          >
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Tipe</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-white focus:outline-none"
              >
                {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Nama Host</label>
              <input
                type="text"
                placeholder="@ atau subdomain"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-white focus:outline-none"
              />
            </div>

            <div className={type === 'MX' ? 'sm:col-span-1' : 'sm:col-span-2'}>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Target / Nilai Konten</label>
              <input
                type="text"
                placeholder={type === 'A' ? '103.145.226.10' : 'Target record'}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-white focus:outline-none"
              />
            </div>

            {type === 'MX' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Priority</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-white focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* DNS Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4 w-20">Tipe</th>
                <th className="py-2.5 px-4">Nama</th>
                <th className="py-2.5 px-4">Nilai / Konten</th>
                <th className="py-2.5 px-4 text-center w-24">TTL</th>
                <th className="py-2.5 px-4 text-center w-20">Prioritas</th>
                <th className="py-2.5 px-4 text-right w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    Tidak ada record DNS ditemukan
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/50 text-blue-400 font-bold text-[10px]">
                        {r.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">
                      {r.name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 break-all">
                      {r.content}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-400 text-[11px] tabular-nums">
                      {r.ttl}s
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-400 tabular-nums">
                      {r.priority ?? '--'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Hapus Record"
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
    </Modal>
  );
};
