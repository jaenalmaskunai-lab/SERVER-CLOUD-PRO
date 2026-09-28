import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { Code, Check, Save } from 'lucide-react';

interface PhpSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  domain: string;
  currentVersion: string;
  onUpdated: (version: string) => void;
}

export const PhpSelectorModal: React.FC<PhpSelectorModalProps> = ({
  isOpen,
  onClose,
  accountId,
  domain,
  currentVersion,
  onUpdated
}) => {
  const { showToast } = useNotification();
  const [selectedVersion, setSelectedVersion] = useState(currentVersion || '8.3');
  const [saving, setSaving] = useState(false);

  const availableVersions = ['7.4', '8.0', '8.1', '8.2', '8.3', '8.4'];

  const [extensions, setExtensions] = useState<Record<string, boolean>>({
    curl: true,
    gd: true,
    mbstring: true,
    openssl: true,
    pdo_mysql: true,
    zip: true,
    opcache: true,
    redis: true,
    soap: false,
    xml: true,
    intl: true,
    bcmath: true,
    imagick: true,
    sodium: true
  });

  const toggleExtension = (key: string) => {
    setExtensions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeExts = Object.keys(extensions).filter((k) => extensions[k]);
      await apiRequest(`/api/accounts/${accountId}/php-version`, {
        method: 'POST',
        body: JSON.stringify({
          php_version: selectedVersion,
          extensions: activeExts
        })
      });

      showToast('Versi PHP Diperbarui', `PHP ${selectedVersion} FPM Pool aktif untuk ${domain}.`, 'success');
      onUpdated(selectedVersion);
      onClose();
    } catch (err: any) {
      showToast('Gagal mengubah versi PHP', err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`PHP Version & Extensions Selector - ${domain}`}
      subtitle="Pilih runtime PHP-FPM dan aktifkan modul ekstensi yang dibutuhkan aplikasi Anda"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* PHP Version Radios */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Versi PHP Aktif
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {availableVersions.map((v) => {
              const isSelected = selectedVersion === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVersion(v)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="text-sm font-mono">PHP {v}</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                    {v === '8.3' || v === '8.4' ? 'Recommended' : (v === '7.4' ? 'Legacy' : 'Stable')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Extensions Matrix */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Ekstensi & Modul PHP
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {Object.keys(extensions).map((ext) => {
              const isChecked = extensions[ext];
              return (
                <button
                  key={ext}
                  type="button"
                  onClick={() => toggleExtension(ext)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-colors text-left ${
                    isChecked
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{ext}</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-800'}`}>
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menerapkan...' : 'Simpan Konfigurasi'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
