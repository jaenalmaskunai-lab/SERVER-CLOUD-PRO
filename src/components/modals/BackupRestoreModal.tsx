import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { HardDriveDownload, RotateCcw, Trash2, Plus, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { BackupItem } from '../../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  domain: string;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  accountId,
  domain
}) => {
  const { showToast } = useNotification();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [restoreLog, setRestoreLog] = useState<string | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<BackupItem[]>(`/api/backups?account_id=${accountId}`);
      setBackups(data);
    } catch (err: any) {
      showToast('Gagal memuat backup', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accountId) {
      loadBackups();
      setRestoreLog(null);
    }
  }, [isOpen, accountId]);

  const handleCreateBackup = async (type: 'full' | 'database' | 'files') => {
    setCreating(true);
    try {
      const res = await apiRequest('/api/backups/create', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          type,
          storage_type: 'local'
        })
      });

      showToast('Snapshot Backup Berhasil', `File: ${res.fileName} (${res.sizeMb} MB)`, 'success');
      loadBackups();
    } catch (err: any) {
      showToast('Gagal membuat backup', err.message, 'danger');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backup: BackupItem) => {
    if (!confirm(`Kembalikan website ke kondisi backup "${backup.file_name}"? File dan database yang ada saat ini akan ditimpa dengan data backup.`)) {
      return;
    }

    setRestoringId(backup.id);
    setRestoreLog('Memulai restorasi data... Memeriksa integritas file arsip.');

    setTimeout(async () => {
      try {
        const res = await apiRequest<{ success: boolean; message: string }>(`/api/backups/${backup.id}/restore`, {
          method: 'POST'
        });

        setRestoreLog(res.message);
        showToast('Restorasi Selesai', 'Data website dan database telah pulih.', 'success');
      } catch (err: any) {
        setRestoreLog(`Gagal: ${err.message}`);
        showToast('Restorasi Gagal', err.message, 'danger');
      } finally {
        setRestoringId(null);
      }
    }, 1200);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus file arsip backup ini?')) return;
    try {
      await apiRequest(`/api/backups/${id}`, { method: 'DELETE' });
      showToast('Backup Dihapus', '', 'info');
      setBackups((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      showToast('Gagal menghapus backup', err.message, 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Backup & Disaster Recovery - ${domain}`}
      subtitle="Buat snapshot cadangan instan dan pulihkan website dalam 1-klik"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Trigger Backup Bar */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-white">Buat Snapshot Cadangan Baru</div>
            <div className="text-[11px] text-slate-400">Pilih komponen yang ingin dicadangkan</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateBackup('full')}
              disabled={creating}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
            >
              {creating ? 'Memproses...' : '+ Full Backup (Web + DB)'}
            </button>
            <button
              onClick={() => handleCreateBackup('database')}
              disabled={creating}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              Hanya Database (.sql)
            </button>
          </div>
        </div>

        {/* Restore Log Alert */}
        {restoreLog && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-emerald-300">Hasil Pemulihan:</div>
              <div className="mt-0.5 text-emerald-200/90">{restoreLog}</div>
            </div>
          </div>
        )}

        {/* Backup List */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Nama File Snapshot</th>
                <th className="py-2.5 px-4">Tipe</th>
                <th className="py-2.5 px-4 text-right">Ukuran</th>
                <th className="py-2.5 px-4 text-center">Waktu Dibuat</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    Belum ada snapshot backup tersedia.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-200 truncate max-w-[220px]">
                      {b.file_name}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300">
                        {b.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300 tabular-nums">
                      {b.file_size_mb} MB
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-400 text-[11px]">
                      {new Date(b.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-2.5 px-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestore(b)}
                        disabled={restoringId === b.id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded text-xs font-sans font-medium transition-colors"
                        title="Pulihkan data dari snapshot ini"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                        <span>{restoringId === b.id ? 'Memulihkan...' : 'Restore'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Hapus Backup"
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
