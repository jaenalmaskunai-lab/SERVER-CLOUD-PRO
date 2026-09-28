import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { Database, Plus, Trash2, ExternalLink, HardDrive } from 'lucide-react';
import { DatabaseItem } from '../../types';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  domain: string;
  username: string;
}

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({
  isOpen,
  onClose,
  accountId,
  domain,
  username
}) => {
  const { showToast } = useNotification();
  const [databases, setDatabases] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New DB form
  const [isAdding, setIsAdding] = useState(false);
  const [dbSuffix, setDbSuffix] = useState('');
  const [userSuffix, setUserSuffix] = useState('');
  const [password, setPassword] = useState('');

  const loadDatabases = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<DatabaseItem[]>(`/api/databases?account_id=${accountId}`);
      setDatabases(data);
    } catch (err: any) {
      showToast('Gagal memuat database', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accountId) {
      loadDatabases();
      setIsAdding(false);
    }
  }, [isOpen, accountId]);

  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbSuffix.trim()) return;

    try {
      await apiRequest('/api/databases', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          db_name: dbSuffix.trim(),
          db_user: userSuffix.trim() || dbSuffix.trim(),
          charset: 'utf8mb4'
        })
      });

      showToast('Database Berhasil Dibuat', `${username}_${dbSuffix}`, 'success');
      setDbSuffix('');
      setUserSuffix('');
      setPassword('');
      setIsAdding(false);
      loadDatabases();
    } catch (err: any) {
      showToast('Gagal membuat database', err.message, 'danger');
    }
  };

  const handleDeleteDatabase = async (id: number, name: string) => {
    if (!confirm(`Hapus database "${name}" beserta seluruh tabel di dalamnya? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      await apiRequest(`/api/databases/${id}`, { method: 'DELETE' });
      showToast('Database Dihapus', name, 'info');
      setDatabases((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      showToast('Gagal menghapus database', err.message, 'danger');
    }
  };

  const handleOpenPhpMyAdmin = () => {
    showToast('phpMyAdmin Session Ready', 'Masuk ke konsol phpMyAdmin server MariaDB.', 'info');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`MySQL / MariaDB Management - ${domain}`}
      subtitle={`Prefix Pengguna Akun: ${username}_`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Server: <strong>MariaDB 11.2 (InnoDB / UTF8MB4)</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPhpMyAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Buka phpMyAdmin</span>
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Database</span>
            </button>
          </div>
        </div>

        {/* Create Database Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateDatabase}
            className="p-4 bg-slate-950 border border-blue-500/40 rounded-xl space-y-3 animate-fadeIn"
          >
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Buat Database Baru
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Nama Database
                </label>
                <div className="flex items-center">
                  <span className="px-2.5 py-1.5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-md text-xs font-mono text-slate-400">
                    {username}_
                  </span>
                  <input
                    type="text"
                    placeholder="app, shop, wp"
                    value={dbSuffix}
                    onChange={(e) => setDbSuffix(e.target.value)}
                    required
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-r-md text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Pengguna Database (User)
                </label>
                <div className="flex items-center">
                  <span className="px-2.5 py-1.5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-md text-xs font-mono text-slate-400">
                    {username}_
                  </span>
                  <input
                    type="text"
                    placeholder="user, admin"
                    value={userSuffix}
                    onChange={(e) => setUserSuffix(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-r-md text-xs text-white focus:outline-none"
                  />
                </div>
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
                Buat Database Sekarang
              </button>
            </div>
          </form>
        )}

        {/* Database List */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Nama Database</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4 text-center">Collation</th>
                <th className="py-2.5 px-4 text-right">Ukuran</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {databases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    Belum ada database MySQL dibuat untuk akun ini.
                  </td>
                </tr>
              ) : (
                databases.map((db) => (
                  <tr key={db.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-emerald-400 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{db.db_name}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {db.db_user}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-400 text-[11px]">
                      {db.charset}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300 tabular-nums">
                      {db.size_mb} MB
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteDatabase(db.id, db.db_name)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Hapus Database"
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
