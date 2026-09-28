import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Code,
  Check,
  Save,
  ShieldCheck,
  Zap,
  Sliders,
  FileCode,
  Search,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';

interface PhpSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  domain: string;
  currentVersion: string;
  onUpdated: (version: string) => void;
}

interface ExtensionDef {
  key: string;
  name: string;
  category: 'encoder' | 'media' | 'database' | 'network' | 'utility';
  desc: string;
  recommended?: boolean;
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
  const [activeTab, setActiveTab] = useState<'extensions' | 'options' | 'ini'>('extensions');
  const [selectedVersion, setSelectedVersion] = useState(currentVersion || '8.3');
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availableVersions = ['7.4', '8.0', '8.1', '8.2', '8.3', '8.4'];

  const extensionCatalog: ExtensionDef[] = [
    // Encoders & Performance
    {
      key: 'ioncube',
      name: 'ionCube PHP Loader (v13.3)',
      category: 'encoder',
      desc: 'Dekoder skrip berlisensi (Sangat dibutuhkan untuk WHMCS, BoxBilling, tema/plugin komersial)',
      recommended: true
    },
    {
      key: 'sourceguardian',
      name: 'SourceGuardian Loader',
      category: 'encoder',
      desc: 'Dekoder skrip terenkripsi alternatif SourceGuardian',
      recommended: false
    },
    {
      key: 'opcache',
      name: 'Zend OPcache',
      category: 'encoder',
      desc: 'Bytecode caching untuk akselerasi loading WordPress & Laravel 3x lebih cepat',
      recommended: true
    },
    {
      key: 'redis',
      name: 'Redis Object Cache',
      category: 'encoder',
      desc: 'Konektor Redis server untuk cache database & session kecepatan tinggi',
      recommended: true
    },
    {
      key: 'memcached',
      name: 'Memcached',
      category: 'encoder',
      desc: 'Konektor memori terdistribusi untuk performa aplikasi web',
      recommended: false
    },

    // Media & Image Processing
    {
      key: 'imagick',
      name: 'ImageMagick (imagick)',
      category: 'media',
      desc: 'Pemroses gambar resolusi tinggi, WebP, SVG, dan thumbnail WordPress',
      recommended: true
    },
    {
      key: 'gd',
      name: 'GD Graphics Library',
      category: 'media',
      desc: 'Manipulasi gambar dasar, pembuatan watermark, dan verifikasi CAPTCHA',
      recommended: true
    },
    {
      key: 'exif',
      name: 'EXIF Metadata Reader',
      category: 'media',
      desc: 'Membaca metadata foto kamera dan rotasi otomatis gambar',
      recommended: true
    },

    // Database Drivers
    {
      key: 'pdo_mysql',
      name: 'PDO MySQL',
      category: 'database',
      desc: 'Koneksi database PDO standar untuk WordPress, Laravel, dan Symfony',
      recommended: true
    },
    {
      key: 'mysqli',
      name: 'MySQLi Extension',
      category: 'database',
      desc: 'Driver native MySQL Improved untuk CMS klasik dan modern',
      recommended: true
    },
    {
      key: 'pdo_sqlite',
      name: 'PDO SQLite',
      category: 'database',
      desc: 'Driver SQLite untuk database lokal ringan',
      recommended: true
    },
    {
      key: 'pdo_pgsql',
      name: 'PDO PostgreSQL',
      category: 'database',
      desc: 'Driver koneksi database PostgreSQL',
      recommended: false
    },

    // Network & APIs
    {
      key: 'curl',
      name: 'cURL Client',
      category: 'network',
      desc: 'Sangat krusial untuk API eksternal (Payment gateway Midtrans, Xendit, Kurir, Webhook)',
      recommended: true
    },
    {
      key: 'openssl',
      name: 'OpenSSL Crypto',
      category: 'network',
      desc: 'Enkripsi data, SSL handshake, dan transaksi HTTPS aman',
      recommended: true
    },
    {
      key: 'soap',
      name: 'SOAP Web Services',
      category: 'network',
      desc: 'Protokol XML SOAP yang dibutuhkan integrasi perbankan & ekspedisi kurir',
      recommended: true
    },
    {
      key: 'xml',
      name: 'XML & SimpleXML',
      category: 'network',
      desc: 'Parser dokumen XML dan RSS feed',
      recommended: true
    },
    {
      key: 'intl',
      name: 'Intl (Internationalization)',
      category: 'network',
      desc: 'Format mata uang Rupiah, penanggalan lokal, dan transliterasi teks',
      recommended: true
    },

    // Utility & Core
    {
      key: 'mbstring',
      name: 'MBString (Multibyte)',
      category: 'utility',
      desc: 'Karakter non-ASCII UTF-8, emoji, dan string multibyte',
      recommended: true
    },
    {
      key: 'zip',
      name: 'ZIP Archive',
      category: 'utility',
      desc: 'Mengekstrak dan membuat file zip di WordPress & plugin manager',
      recommended: true
    },
    {
      key: 'bcmath',
      name: 'BCMath (Arbitrary Precision)',
      category: 'utility',
      desc: 'Kalkulasi matematika presisi tinggi untuk toko online & billing',
      recommended: true
    },
    {
      key: 'sodium',
      name: 'libsodium Cryptography',
      category: 'utility',
      desc: 'Kriptografi modern untuk hashing password dan token keamanan',
      recommended: true
    },
    {
      key: 'fileinfo',
      name: 'FileInfo MIME Reader',
      category: 'utility',
      desc: 'Deteksi tipe file upload secara akurat dan aman',
      recommended: true
    },
    {
      key: 'swoole',
      name: 'Swoole Async Engine',
      category: 'utility',
      desc: 'Framework coroutine async PHP untuk high-concurrency microservices',
      recommended: false
    }
  ];

  const [extensions, setExtensions] = useState<Record<string, boolean>>({
    ioncube: true,
    sourceguardian: false,
    opcache: true,
    redis: true,
    memcached: false,
    imagick: true,
    gd: true,
    exif: true,
    pdo_mysql: true,
    mysqli: true,
    pdo_sqlite: true,
    pdo_pgsql: false,
    curl: true,
    openssl: true,
    soap: true,
    xml: true,
    intl: true,
    mbstring: true,
    zip: true,
    bcmath: true,
    sodium: true,
    fileinfo: true,
    swoole: false
  });

  const [phpOptions, setPhpOptions] = useState({
    upload_max_filesize: '256M',
    post_max_size: '256M',
    memory_limit: '512M',
    max_execution_time: 300,
    max_input_time: 300,
    max_input_vars: 5000,
    allow_url_fopen: true,
    display_errors: false
  });

  const [rawIni, setRawIni] = useState('');

  // Fetch current config from server
  useEffect(() => {
    if (isOpen) {
      const fetchConfig = async () => {
        setLoadingConfig(true);
        try {
          const res = await apiRequest<any>(`/api/accounts/${accountId}/php-config`);
          if (res.php_version) setSelectedVersion(res.php_version);
          if (res.extensions && Array.isArray(res.extensions)) {
            const nextExts = { ...extensions };
            // Set all active in response to true
            res.extensions.forEach((e: string) => {
              nextExts[e] = true;
            });
            // Ensure ioncube is recognized
            if (res.ioncube_loaded) nextExts.ioncube = true;
            setExtensions(nextExts);
          }
          if (res.options) {
            setPhpOptions((prev) => ({ ...prev, ...res.options }));
          }
          if (res.ini_content) {
            setRawIni(res.ini_content);
          }
        } catch (err) {
          console.error('Failed to load PHP config:', err);
        } finally {
          setLoadingConfig(false);
        }
      };
      fetchConfig();
    }
  }, [isOpen, accountId]);

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
          extensions: activeExts,
          options: phpOptions,
          ini_content: rawIni
        })
      });

      showToast(
        'Konfigurasi PHP Berhasil Diterapkan!',
        `PHP ${selectedVersion} dengan ionCube Loader dan php.ini aktif untuk ${domain}.`,
        'success'
      );
      onUpdated(selectedVersion);
      onClose();
    } catch (err: any) {
      showToast('Gagal mengubah konfigurasi PHP', err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const filteredExtensions = extensionCatalog.filter(
    (ext) =>
      ext.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`MultiPHP Manager & INI Editor - ${domain}`}
      subtitle="Kelola runtime PHP-FPM, ekstensi ionCube Loader, dan konfigurasi direktif php.ini kustom."
      maxWidth="4xl"
    >
      <div className="space-y-5 -mt-2">
        {/* Runtime Status Pill Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Code className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span>Runtime Aktif: <strong>PHP {selectedVersion}</strong></span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-mono">
                  PHP-FPM Active
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Konfigurasi disimpan ke <code>/public_html/.user.ini</code>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
              extensions.ioncube
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ionCube: {extensions.ioncube ? 'Aktif' : 'Nonaktif'}</span>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
              extensions.opcache
                ? 'bg-blue-950/60 border-blue-800/80 text-blue-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}>
              <Zap className="w-3.5 h-3.5" />
              <span>OPcache: {extensions.opcache ? 'Aktif' : 'Nonaktif'}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('extensions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'extensions'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Versi PHP & Ekstensi (ionCube, OPcache)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('options')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'options'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Opsi & Direktif php.ini (Upload, Memory Limit)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ini')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'ini'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            <span>Editor Teks .user.ini</span>
          </button>
        </div>

        {/* TAB 1: EXTENSIONS & PHP VERSION */}
        {activeTab === 'extensions' && (
          <div className="space-y-4">
            {/* Version Radios */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Pilih Versi PHP:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {availableVersions.map((v) => {
                  const isSelected = selectedVersion === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVersion(v)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-blue-600/25 border-blue-500 text-blue-300 font-bold shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="text-sm font-mono font-bold">PHP {v}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {v === '8.3' ? 'Recommended' : (v === '8.4' ? 'Latest' : (v === '7.4' ? 'Legacy' : 'Stable'))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extension Search and ionCube Banner */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Daftar Ekstensi & Modul Server:
                </div>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Cari ekstensi (ioncube, redis...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Special ionCube Highlight Banner */}
              <div className="p-3 bg-gradient-to-r from-emerald-950/30 to-blue-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>ionCube PHP Loader v13.3</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                        Siap Pakai
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Memungkinkan eksekusi file terenkripsi ionCube (seperti WHMCS, script lisensi, dan plugin premium).
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExtension('ioncube')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    extensions.ioncube
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {extensions.ioncube ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{extensions.ioncube ? 'Terpasang' : 'Aktifkan'}</span>
                </button>
              </div>

              {/* Extensions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredExtensions.map((ext) => {
                  const isChecked = extensions[ext.key] || false;
                  return (
                    <button
                      key={ext.key}
                      type="button"
                      onClick={() => toggleExtension(ext.key)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isChecked
                          ? 'bg-emerald-950/20 border-emerald-800/50 text-slate-200'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="font-mono text-xs font-bold text-white flex items-center gap-1">
                          <span>{ext.name}</span>
                          {ext.key === 'ioncube' && <span className="text-amber-400">★</span>}
                        </span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">
                        {ext.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PHP.INI DIRECTIVES / OPTIONS */}
        {activeTab === 'options' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-950/20 border border-blue-800/30 rounded-xl text-xs text-blue-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Nilai konfigurasi di bawah otomatis diterapkan ke direktori web melalui <code>.user.ini</code> tanpa perlu restart web server.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* upload_max_filesize */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-white flex items-center justify-between">
                  <span>upload_max_filesize</span>
                  <span className="text-[10px] text-slate-400">Batas Ukuran Upload</span>
                </label>
                <select
                  value={phpOptions.upload_max_filesize}
                  onChange={(e) => setPhpOptions({ ...phpOptions, upload_max_filesize: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                >
                  <option value="32M">32 MB</option>
                  <option value="64M">64 MB</option>
                  <option value="128M">128 MB</option>
                  <option value="256M">256 MB (Disarankan)</option>
                  <option value="512M">512 MB</option>
                  <option value="1024M">1024 MB (1 GB)</option>
                </select>
                <p className="text-[10px] text-slate-400">Batas maksimal satu file yang dapat diupload ke CMS/WordPress.</p>
              </div>

              {/* post_max_size */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-white flex items-center justify-between">
                  <span>post_max_size</span>
                  <span className="text-[10px] text-slate-400">Batas Total Request POST</span>
                </label>
                <select
                  value={phpOptions.post_max_size}
                  onChange={(e) => setPhpOptions({ ...phpOptions, post_max_size: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                >
                  <option value="64M">64 MB</option>
                  <option value="128M">128 MB</option>
                  <option value="256M">256 MB (Disarankan)</option>
                  <option value="512M">512 MB</option>
                  <option value="1024M">1024 MB (1 GB)</option>
                </select>
                <p className="text-[10px] text-slate-400">Harus setara atau lebih besar dari <code>upload_max_filesize</code>.</p>
              </div>

              {/* memory_limit */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-white flex items-center justify-between">
                  <span>memory_limit</span>
                  <span className="text-[10px] text-slate-400">Alokasi RAM PHP</span>
                </label>
                <select
                  value={phpOptions.memory_limit}
                  onChange={(e) => setPhpOptions({ ...phpOptions, memory_limit: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                >
                  <option value="128M">128 MB</option>
                  <option value="256M">256 MB</option>
                  <option value="512M">512 MB (Optimal WordPress & Elementor)</option>
                  <option value="1024M">1024 MB (1 GB)</option>
                  <option value="2048M">2048 MB (2 GB)</option>
                </select>
                <p className="text-[10px] text-slate-400">Mencegah error 'Fatal error: Allowed memory size of bytes exhausted'.</p>
              </div>

              {/* max_execution_time */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-white flex items-center justify-between">
                  <span>max_execution_time</span>
                  <span className="text-[10px] text-slate-400">Timeout Eksekusi Script</span>
                </label>
                <select
                  value={phpOptions.max_execution_time}
                  onChange={(e) => setPhpOptions({ ...phpOptions, max_execution_time: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                >
                  <option value={30}>30 Detik (Default Standar)</option>
                  <option value={60}>60 Detik</option>
                  <option value={120}>120 Detik</option>
                  <option value={300}>300 Detik (5 Menit - Disarankan)</option>
                  <option value={600}>600 Detik (10 Menit)</option>
                </select>
                <p className="text-[10px] text-slate-400">Mencegah script berhenti di tengah saat impor demo / backup besar.</p>
              </div>

              {/* max_input_vars */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="font-semibold text-white flex items-center justify-between">
                  <span>max_input_vars</span>
                  <span className="text-[10px] text-slate-400">Batas Form Inputs</span>
                </label>
                <select
                  value={phpOptions.max_input_vars}
                  onChange={(e) => setPhpOptions({ ...phpOptions, max_input_vars: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                >
                  <option value={1000}>1,000</option>
                  <option value={3000}>3,000</option>
                  <option value={5000}>5,000 (Sangat Dianjurkan)</option>
                  <option value={10000}>10,000</option>
                </select>
                <p className="text-[10px] text-slate-400">Sangat dibutuhkan untuk Mega Menu WooCommerce & tabel atribut produk.</p>
              </div>

              {/* allow_url_fopen & display_errors */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                <label className="font-semibold text-white block">
                  Fitur Tambahan
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">allow_url_fopen:</span>
                  <button
                    type="button"
                    onClick={() => setPhpOptions({ ...phpOptions, allow_url_fopen: !phpOptions.allow_url_fopen })}
                    className={`px-3 py-1 rounded text-[11px] font-bold ${
                      phpOptions.allow_url_fopen ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {phpOptions.allow_url_fopen ? 'Aktif (On)' : 'Nonaktif (Off)'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">display_errors:</span>
                  <button
                    type="button"
                    onClick={() => setPhpOptions({ ...phpOptions, display_errors: !phpOptions.display_errors })}
                    className={`px-3 py-1 rounded text-[11px] font-bold ${
                      phpOptions.display_errors ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {phpOptions.display_errors ? 'Debug (On)' : 'Produksi (Off)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RAW .USER.INI */}
        {activeTab === 'ini' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              Isi langsung file <code>/public_html/.user.ini</code> untuk pengaturan tingkat lanjut:
            </div>
            <textarea
              rows={10}
              value={rawIni}
              onChange={(e) => setRawIni(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-emerald-400 focus:outline-none focus:border-blue-500 leading-relaxed"
              placeholder="upload_max_filesize = 256M&#10;post_max_size = 256M&#10;memory_limit = 512M"
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingConfig}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan & Reload FPM...' : 'Terapkan Konfigurasi PHP'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
