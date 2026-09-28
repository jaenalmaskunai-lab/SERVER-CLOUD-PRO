import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Folder,
  FileCode,
  FileText,
  File,
  ArrowLeft,
  Plus,
  FolderPlus,
  Trash2,
  Save,
  KeyRound,
  FileUp,
  RefreshCw
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  permissions: string;
  modifiedAt: string;
  content?: string;
}

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  domain: string;
}

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  accountId,
  domain
}) => {
  const { showToast } = useNotification();
  const [currentPath, setCurrentPath] = useState('/public_html');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  // File Editor state
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);

  // New file / folder modal state
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  // Chmod state
  const [chmodItem, setChmodItem] = useState<FileItem | null>(null);
  const [newChmod, setNewChmod] = useState('0644');

  const loadDirectory = async (path: string = currentPath) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ path: string; items: FileItem[] }>(
        `/api/files?account_id=${accountId}&path=${encodeURIComponent(path)}`
      );
      setItems(data.items);
      setCurrentPath(data.path);
    } catch (err: any) {
      showToast('Gagal memuat direktori', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accountId) {
      loadDirectory('/public_html');
      setActiveFile(null);
    }
  }, [isOpen, accountId]);

  const handleOpenItem = async (item: FileItem) => {
    if (item.isDir) {
      loadDirectory(item.path);
    } else {
      // Open in editor
      try {
        const file = await apiRequest<FileItem>(
          `/api/files/read?account_id=${accountId}&path=${encodeURIComponent(item.path)}`
        );
        setActiveFile(file);
        setEditorContent(file.content || '');
      } catch (err: any) {
        showToast('Gagal membuka file', err.message, 'danger');
      }
    }
  };

  const handleNavigateUp = () => {
    if (currentPath === '/public_html' || currentPath === '/') return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/public_html';
    loadDirectory(parent);
  };

  const handleSaveFile = async () => {
    if (!activeFile) return;
    setSavingFile(true);
    try {
      await apiRequest('/api/files/write', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          path: activeFile.path,
          content: editorContent
        })
      });
      showToast('Perubahan Disimpan', `File ${activeFile.name} berhasil disimpan.`, 'success');
      loadDirectory(currentPath);
    } catch (err: any) {
      showToast('Gagal menyimpan file', err.message, 'danger');
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      await apiRequest('/api/files/create-file', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          dir_path: currentPath,
          filename: newItemName.trim()
        })
      });
      showToast('File Berhasil Dibuat', newItemName, 'success');
      setNewItemName('');
      setIsCreatingFile(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      showToast('Gagal membuat file', err.message, 'danger');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    try {
      await apiRequest('/api/files/create-folder', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          dir_path: currentPath,
          folder_name: newItemName.trim()
        })
      });
      showToast('Folder Berhasil Dibuat', newItemName, 'success');
      setNewItemName('');
      setIsCreatingFolder(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      showToast('Gagal membuat folder', err.message, 'danger');
    }
  };

  const handleDeleteItem = async (item: FileItem) => {
    if (!confirm(`Hapus ${item.isDir ? 'folder' : 'file'} "${item.name}" secara permanen?`)) return;
    try {
      await apiRequest(`/api/files?account_id=${accountId}&path=${encodeURIComponent(item.path)}`, {
        method: 'DELETE'
      });
      showToast('Berhasil Dihapus', `${item.name} telah dihapus.`, 'info');
      loadDirectory(currentPath);
      if (activeFile?.path === item.path) setActiveFile(null);
    } catch (err: any) {
      showToast('Gagal menghapus', err.message, 'danger');
    }
  };

  const handleChmod = async () => {
    if (!chmodItem) return;
    try {
      await apiRequest('/api/files/chmod', {
        method: 'POST',
        body: JSON.stringify({
          account_id: accountId,
          path: chmodItem.path,
          permissions: newChmod
        })
      });
      showToast('Hak Akses Diperbarui', `${chmodItem.name} -> ${newChmod}`, 'success');
      setChmodItem(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      showToast('Gagal mengubah hak akses', err.message, 'danger');
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.isDir) return <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
    if (item.name.endsWith('.php') || item.name.endsWith('.js') || item.name.endsWith('.html') || item.name.endsWith('.css')) {
      return <FileCode className="w-4 h-4 text-blue-400" />;
    }
    if (item.name.startsWith('.')) return <KeyRound className="w-4 h-4 text-purple-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`File Manager - ${domain}`}
      subtitle={`Direktori Virtual VHost: ${currentPath}`}
      maxWidth="5xl"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleNavigateUp}
              disabled={currentPath === '/public_html' || currentPath === '/'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-colors"
              title="Kembali ke folder atas"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 max-w-md truncate">
              {currentPath}
            </div>
            <button
              onClick={() => loadDirectory(currentPath)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsCreatingFile(true); setNewItemName(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>File Baru</span>
            </button>
            <button
              onClick={() => { setIsCreatingFolder(true); setNewItemName(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Folder Baru</span>
            </button>
          </div>
        </div>

        {/* Main Workspace (Grid / Split if file open) */}
        <div className="flex-1 flex overflow-hidden mt-4 gap-4">
          {/* File List */}
          <div className={`overflow-y-auto flex-1 ${activeFile ? 'hidden md:block md:w-1/3' : 'w-full'}`}>
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-800 bg-slate-950/60 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Nama</th>
                  <th className="py-2.5 px-3 text-right">Ukuran</th>
                  <th className="py-2.5 px-3 text-center">Perms</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Direktori kosong
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        activeFile?.path === item.path ? 'bg-blue-950/30 text-blue-300' : ''
                      }`}
                      onClick={() => handleOpenItem(item)}
                    >
                      <td className="py-2.5 px-3 flex items-center gap-2 font-medium truncate max-w-[200px]">
                        {getFileIcon(item)}
                        <span className="truncate">{item.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400 tabular-nums">
                        {item.isDir ? '--' : formatFileSize(item.size)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChmodItem(item);
                            setNewChmod(item.permissions);
                          }}
                          className="hover:underline hover:text-white"
                        >
                          {item.permissions}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Hapus"
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

          {/* Active File Editor */}
          {activeFile && (
            <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-xs font-semibold text-white">{activeFile.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({formatFileSize(activeFile.size)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveFile}
                    disabled={savingFile}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium shadow-sm transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingFile ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                  <button
                    onClick={() => setActiveFile(null)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="flex-1 w-full p-4 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Modal: Create File */}
        {isCreatingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
              <h4 className="font-semibold text-white text-sm mb-3">Buat File Baru</h4>
              <form onSubmit={handleCreateFile}>
                <input
                  type="text"
                  placeholder="contoh: style.css, script.js"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white mb-4 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFile(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                  >
                    Buat File
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Folder */}
        {isCreatingFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
              <h4 className="font-semibold text-white text-sm mb-3">Buat Folder Baru</h4>
              <form onSubmit={handleCreateFolder}>
                <input
                  type="text"
                  placeholder="contoh: images, includes"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white mb-4 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                  >
                    Buat Folder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Chmod */}
        {chmodItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
              <h4 className="font-semibold text-white text-sm mb-2">Ubah Hak Akses (Permissions)</h4>
              <p className="text-xs text-slate-400 mb-3 font-mono">{chmodItem.name}</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {['0644', '0755', '0777', '0600', '0700', '0666'].map((perm) => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => setNewChmod(perm)}
                    className={`py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                      newChmod === perm
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {perm}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChmodItem(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleChmod}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
