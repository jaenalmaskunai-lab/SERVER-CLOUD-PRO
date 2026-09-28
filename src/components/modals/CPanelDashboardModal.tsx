import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { HostingAccount } from '../../types';
import {
  FolderOpen,
  Database,
  Globe2,
  Mail,
  Code,
  ShieldCheck,
  RotateCcw,
  Terminal,
  Cpu,
  Server,
  HardDrive,
  Activity,
  Search,
  ExternalLink,
  Sparkles,
  Lock,
  Layers,
  FileText,
  Sliders,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Key,
  Flame
} from 'lucide-react';

interface CPanelDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: HostingAccount;
  onOpenSubModal: (modalType: 'files' | 'dns' | 'db' | 'email' | 'php' | 'backup') => void;
  onRefreshAccount: () => void;
}

export const CPanelDashboardModal: React.FC<CPanelDashboardModalProps> = ({
  isOpen,
  onClose,
  account,
  onOpenSubModal,
  onRefreshAccount
}) => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'wordpress' | 'subdomains' | 'terminal' | 'logs' | 'metrics' | 'phpmyadmin'>('overview');

  // WordPress Installer state
  const [wpTitle, setWpTitle] = useState('Situs Bisnis Saya');
  const [wpUser, setWpUser] = useState('admin');
  const [wpPass, setWpPass] = useState('AdminPass2026!');
  const [wpInstalling, setWpInstalling] = useState(false);
  const [wpInstalledInfo, setWpInstalledInfo] = useState<any>(null);

  // Subdomain state
  const [subdomains, setSubdomains] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);

  // Terminal state
  const [termCommand, setTermCommand] = useState('');
  const [termOutput, setTermOutput] = useState<Array<{ cmd: string; out: string }>>([
    { cmd: 'init', out: `[cPanel Terminal Shell - Virtualhost Sandbox for ${account.domain}]\nLogged in as ${account.username} (uid=1004 gid=1004)\nKetik perintah seperti 'ls -la', 'php -v', 'wp --info', 'df -h', atau pilih tombol preset di bawah.` }
  ]);
  const [runningCmd, setRunningCmd] = useState(false);

  // Error Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // SSL Reissue state
  const [reissuingSsl, setReissuingSsl] = useState(false);

  // ModSec WAF state
  const [wafActive, setWafActive] = useState(true);

  // Fetch Subdomains when tab opened
  const fetchSubdomains = async () => {
    setLoadingSubs(true);
    try {
      const data = await apiRequest<any[]>(`/api/accounts/${account.id}/subdomains`);
      setSubdomains(data);
    } catch (err: any) {
      console.error('Failed to load subdomains', err);
    } finally {
      setLoadingSubs(false);
    }
  };

  // Fetch Logs when tab opened
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await apiRequest<{ domain: string; logs: any[] }>(`/api/accounts/${account.id}/logs`);
      setLogs(data.logs || []);
    } catch (err: any) {
      console.error('Failed to load logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'subdomains') fetchSubdomains();
      if (activeTab === 'logs') fetchLogs();
    }
  }, [isOpen, activeTab, account.id]);

  const handleCreateSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    setCreatingSub(true);
    try {
      const res = await apiRequest<{ success: boolean; subdomain: any }>(`/api/accounts/${account.id}/subdomains`, {
        method: 'POST',
        body: JSON.stringify({ subdomain_name: newSubName.trim() })
      });
      showToast('Subdomain Dibuat', `Subdomain ${res.subdomain.subdomain} telah aktif dengan direktori ${res.subdomain.root}`, 'success');
      setNewSubName('');
      fetchSubdomains();
    } catch (err: any) {
      showToast('Gagal membuat subdomain', err.message, 'danger');
    } finally {
      setCreatingSub(false);
    }
  };

  const handleDeleteSubdomain = async (sub: any) => {
    if (!confirm(`Hapus subdomain ${sub.subdomain}?`)) return;
    try {
      await apiRequest(`/api/accounts/${account.id}/subdomains/${sub.id}`, { method: 'DELETE' });
      showToast('Subdomain Dihapus', `Subdomain ${sub.subdomain} berhasil dihapus.`, 'info');
      fetchSubdomains();
    } catch (err: any) {
      showToast('Gagal menghapus subdomain', err.message, 'danger');
    }
  };

  const handleInstallWordPress = async (e: React.FormEvent) => {
    e.preventDefault();
    setWpInstalling(true);
    try {
      const res = await apiRequest<any>(`/api/accounts/${account.id}/install-app`, {
        method: 'POST',
        body: JSON.stringify({
          app_id: 'wordpress',
          site_title: wpTitle,
          admin_username: wpUser,
          admin_password: wpPass,
          admin_email: `admin@${account.domain}`
        })
      });
      setWpInstalledInfo(res.details);
      showToast('WordPress Berhasil Diinstal!', `WordPress aktif di https://${account.domain}.`, 'success');
      onRefreshAccount();
    } catch (err: any) {
      showToast('Gagal menginstal WordPress', err.message, 'danger');
    } finally {
      setWpInstalling(false);
    }
  };

  const handleExecuteCommand = async (cmdToRun?: string) => {
    const cmd = cmdToRun || termCommand;
    if (!cmd.trim()) return;

    setRunningCmd(true);
    try {
      const res = await apiRequest<{ output: string }>(`/api/accounts/${account.id}/terminal`, {
        method: 'POST',
        body: JSON.stringify({ command: cmd.trim() })
      });
      setTermOutput((prev) => [...prev, { cmd, out: res.output }]);
      setTermCommand('');
    } catch (err: any) {
      setTermOutput((prev) => [...prev, { cmd, out: `Error: ${err.message}` }]);
    } finally {
      setRunningCmd(false);
    }
  };

  const handleReissueSsl = async () => {
    setReissuingSsl(true);
    try {
      await apiRequest(`/api/accounts/${account.id}/reissue-ssl`, { method: 'POST' });
      showToast("AutoSSL Let's Encrypt Berhasil Diterbitkan", `Sertifikat SSL wildcard aktif untuk *.${account.domain}`, 'success');
      onRefreshAccount();
    } catch (err: any) {
      showToast('Gagal memperbarui SSL', err.message, 'danger');
    } finally {
      setReissuingSsl(false);
    }
  };

  // Quota Calculations
  const maxDisk = account.package_disk_mb || 5120;
  const diskPercent = Math.min(100, Math.round((account.disk_used_mb / maxDisk) * 100));
  const maxBw = account.package_bw_mb || 51200;
  const bwPercent = Math.min(100, Math.round((account.bandwidth_used_mb / maxBw) * 100));

  // cPanel features structure
  const cpanelCategories = [
    {
      name: 'File & Direktori',
      color: 'blue',
      items: [
        {
          id: 'file-manager',
          name: 'File Manager',
          desc: 'Jelajahi, edit, dan upload file di /public_html',
          icon: FolderOpen,
          action: () => onOpenSubModal('files'),
          badge: 'vhost'
        },
        {
          id: 'backup-wizard',
          name: 'Backup Wizard',
          desc: '1-Klik buat cadangan file & basis data',
          icon: RotateCcw,
          action: () => onOpenSubModal('backup'),
          badge: 'Auto'
        },
        {
          id: 'disk-usage',
          name: 'Penggunaan Disk',
          desc: 'Analisis ukuran folder dan file log',
          icon: HardDrive,
          action: () => setActiveTab('metrics'),
          badge: `${account.disk_used_mb} MB`
        }
      ]
    },
    {
      name: 'Basis Data MySQL®',
      color: 'emerald',
      items: [
        {
          id: 'mysql-db',
          name: 'MySQL Databases',
          desc: 'Buat & kelola database, pengguna MySQL, dan hak akses',
          icon: Database,
          action: () => onOpenSubModal('db'),
          badge: `${account.counts?.databases || 1} Aktif`
        },
        {
          id: 'phpmyadmin',
          name: 'phpMyAdmin Web UI',
          desc: 'Kelola tabel, impor/ekspor SQL, dan query interaktif',
          icon: Sliders,
          action: () => setActiveTab('phpmyadmin'),
          badge: 'Online'
        }
      ]
    },
    {
      name: 'Domain & Pengaturan DNS',
      color: 'cyan',
      items: [
        {
          id: 'zone-editor',
          name: 'DNS Zone Editor',
          desc: 'Kelola record DNS A, CNAME, MX, TXT, dan DKIM',
          icon: Globe2,
          action: () => onOpenSubModal('dns'),
          badge: 'DNS'
        },
        {
          id: 'subdomains',
          name: 'Subdomain Manager',
          desc: 'Buat subdomain (blog, api, app) dengan folder mandiri',
          icon: Layers,
          action: () => setActiveTab('subdomains'),
          badge: `${subdomains.length} Domain`
        }
      ]
    },
    {
      name: 'Layanan Email (Webmail)',
      color: 'purple',
      items: [
        {
          id: 'email-accounts',
          name: 'Akun Email Domain',
          desc: 'Buat kotak surat webmaster@, info@, sales@',
          icon: Mail,
          action: () => onOpenSubModal('email'),
          badge: `${account.counts?.emails || 1} Kotak`
        },
        {
          id: 'webmail-access',
          name: 'Buka Webmail Client',
          desc: 'Akses antarmuka webmail Roundcube bawaan',
          icon: Mail,
          action: () => onOpenSubModal('email'),
          badge: 'Roundcube'
        }
      ]
    },
    {
      name: 'Software & App Installer (Softaculous)',
      color: 'amber',
      items: [
        {
          id: 'wp-installer',
          name: 'WordPress 1-Click Installer',
          desc: 'Instal WordPress versi terbaru dalam 10 detik',
          icon: Sparkles,
          action: () => setActiveTab('wordpress'),
          badge: 'Softaculous'
        },
        {
          id: 'php-selector',
          name: 'MultiPHP Manager & INI',
          desc: `Ganti runtime PHP ${account.php_version}, aktifkan ionCube Loader, dan konfigurasi php.ini`,
          icon: Code,
          action: () => onOpenSubModal('php'),
          badge: 'ionCube Ready'
        }
      ]
    },
    {
      name: 'Keamanan & Konsol Server',
      color: 'rose',
      items: [
        {
          id: 'autossl',
          name: 'SSL/TLS Status (Let\'s Encrypt)',
          desc: 'Perpanjang sertifikat AutoSSL gratis dengan 1 klik',
          icon: ShieldCheck,
          action: handleReissueSsl,
          badge: account.ssl_status === 'active' ? 'SSL Aktif' : 'Perlu Diperbarui'
        },
        {
          id: 'terminal',
          name: 'Web Terminal (SSH Console)',
          desc: 'Jalankan perintah bash, wp-cli, composer, dan git',
          icon: Terminal,
          action: () => setActiveTab('terminal'),
          badge: 'SSH'
        },
        {
          id: 'modsec',
          name: 'ModSecurity (WAF Firewall)',
          desc: wafActive ? 'Proteksi Web Application Firewall aktif' : 'WAF dinonaktifkan',
          icon: Shield,
          action: () => {
            setWafActive(!wafActive);
            showToast('ModSecurity', `ModSecurity WAF sekarang ${!wafActive ? 'Aktif' : 'Nonaktif'} untuk ${account.domain}`, 'info');
          },
          badge: wafActive ? 'Aktif' : 'Nonaktif'
        }
      ]
    },
    {
      name: 'Metrik, Pemantauan & Log',
      color: 'indigo',
      items: [
        {
          id: 'error-logs',
          name: 'Error Log Viewer',
          desc: 'Pantau log error web server Apache/Nginx real-time',
          icon: FileText,
          action: () => setActiveTab('logs'),
          badge: 'Live Log'
        },
        {
          id: 'visitor-metrics',
          name: 'Statistik & Resource LVE',
          desc: 'Grafik pemakaian CPU, RAM, IOPS, dan trafik bandwidth',
          icon: Activity,
          action: () => setActiveTab('metrics'),
          badge: 'Telemetry'
        }
      ]
    }
  ];

  // Filter features based on search
  const filteredCategories = cpanelCategories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter((cat) => cat.items.length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="5xl"
    >
      <div className="-mt-4 space-y-4">
        {/* cPanel Jupiter Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/90 flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-black text-lg">
              cP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-base">
                  {account.domain}
                </span>
                <a
                  href={`https://${account.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                  title="Kunjungi Website"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>VirtualHost Aktif</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                <span>User: <strong className="text-slate-200">{account.username}</strong></span>
                <span>•</span>
                <span>IP: <strong className="text-slate-200">{account.server_ip || '103.145.226.10'}</strong></span>
                <span>•</span>
                <span>Node: <strong className="text-slate-200">{account.server_name || 'Node JKT'}</strong></span>
                <span>•</span>
                <span>Paket: <strong className="text-blue-400">{account.package_name}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenSubModal('files')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>File Manager</span>
            </button>
            <button
              onClick={() => setActiveTab('wordpress')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Softaculous WP</span>
            </button>
            <button
              onClick={handleReissueSsl}
              disabled={reissuingSsl}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-colors"
              title="Perbarui AutoSSL Let's Encrypt"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${reissuingSsl ? 'animate-spin' : ''}`} />
              <span>{reissuingSsl ? 'Memperbarui...' : 'AutoSSL'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Pusat Kontrol cPanel
          </button>
          <button
            onClick={() => setActiveTab('wordpress')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'wordpress'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Install WordPress (Softaculous)</span>
          </button>
          <button
            onClick={() => setActiveTab('subdomains')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'subdomains'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kelola Subdomain</span>
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'terminal'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Web SSH Terminal</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Error Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'metrics'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>Resource LVE</span>
          </button>
          <button
            onClick={() => setActiveTab('phpmyadmin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'phpmyadmin'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>phpMyAdmin Client</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW (cPanel Jupiter Feature Suite) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main Feature Icons (3 Columns) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Feature Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ketik untuk mencari fitur cPanel (File, MySQL, PHP, SSL, Subdomain, WordPress...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Categorized Features */}
              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                {filteredCategories.map((cat) => (
                  <div key={cat.name} className="p-3.5 bg-slate-900/70 border border-slate-800/80 rounded-2xl">
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono lowercase">{cat.items.length} fitur</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {cat.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            className="p-3 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all group flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 group-hover:text-white group-hover:bg-blue-600 transition-colors">
                                <Icon className="w-4 h-4" />
                              </div>
                              {item.badge && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {item.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Statistics Bar (cPanel Stats Bar) */}
            <div className="space-y-4">
              {/* General Information Box */}
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs space-y-2.5">
                <div className="font-bold text-white text-xs uppercase tracking-wider border-b border-slate-800 pb-1.5">
                  Informasi Umum
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Pengguna cPanel:</span>
                  <span className="font-mono text-white">{account.username}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Document Root:</span>
                  <span className="font-mono text-blue-400">/public_html</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">IP Server:</span>
                  <span className="font-mono text-slate-200">{account.server_ip || '103.145.226.10'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">Versi PHP:</span>
                  <span className="font-mono font-bold text-amber-400">PHP {account.php_version}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/50">
                  <span className="text-slate-400">AutoSSL:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Let's Encrypt</span>
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Nameserver:</span>
                  <span className="font-mono text-[11px] text-slate-300">ns1.cloudpro.id</span>
                </div>
              </div>

              {/* Statistics Meters */}
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs space-y-3">
                <div className="font-bold text-white text-xs uppercase tracking-wider border-b border-slate-800 pb-1.5">
                  Statistik Resource
                </div>

                {/* Disk Space */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-mono">
                    <span className="text-slate-400">Disk NVMe SSD</span>
                    <span className="text-white font-bold">{account.disk_used_mb} MB / {maxDisk / 1024} GB</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full ${diskPercent > 85 ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${diskPercent}%` }}
                    />
                  </div>
                </div>

                {/* Bandwidth */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-mono">
                    <span className="text-slate-400">Bandwidth Bulanan</span>
                    <span className="text-white font-bold">{account.bandwidth_used_mb} MB / {maxBw / 1024} GB</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full ${bwPercent > 85 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${bwPercent}%` }}
                    />
                  </div>
                </div>

                {/* Database Count */}
                <div className="flex justify-between py-1 border-t border-slate-800/50">
                  <span className="text-slate-400">MySQL Databases:</span>
                  <span className="font-mono text-white font-semibold">1 / 5</span>
                </div>

                {/* Email Accounts */}
                <div className="flex justify-between py-1 border-t border-slate-800/50">
                  <span className="text-slate-400">Akun Email:</span>
                  <span className="font-mono text-white font-semibold">1 / 10</span>
                </div>

                {/* Subdomains */}
                <div className="flex justify-between py-1 border-t border-slate-800/50">
                  <span className="text-slate-400">Subdomain:</span>
                  <span className="font-mono text-white font-semibold">{subdomains.length} / 5</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SOFTACULOUS WORDPRESS INSTALLER */}
        {activeTab === 'wordpress' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Softaculous 1-Click WordPress Installer</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950 text-blue-400 border border-blue-800">WordPress 6.7</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Instal WordPress secara instan ke direktori <code>/public_html</code> domain <strong>{account.domain}</strong> lengkap dengan database MySQL dan HTTPS Let's Encrypt.
                </p>
              </div>
            </div>

            {wpInstalledInfo ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span>WordPress Berhasil Diprovisi dan Siap Digunakan!</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400">URL Situs: </span>
                    <a href={`https://${account.domain}`} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                      https://{account.domain}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400">URL Admin: </span>
                    <a href={`https://${account.domain}/wp-admin`} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                      https://{account.domain}/wp-admin
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400">Admin User: </span>
                    <strong className="text-white">{wpInstalledInfo.admin_user}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Database MySQL: </span>
                    <strong className="text-white">{wpInstalledInfo.database}</strong>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenSubModal('files')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                  >
                    Buka File Manager (public_html)
                  </button>
                  <button
                    onClick={() => setWpInstalledInfo(null)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs"
                  >
                    Instal Ulang / Ganti Opsi
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInstallWordPress} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Judul Website *
                    </label>
                    <input
                      type="text"
                      value={wpTitle}
                      onChange={(e) => setWpTitle(e.target.value)}
                      required
                      placeholder="contoh: Toko Online Resmi"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Target Domain / Direktori
                    </label>
                    <input
                      type="text"
                      value={`https://${account.domain}/ (Root public_html)`}
                      disabled
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Admin Username *
                    </label>
                    <input
                      type="text"
                      value={wpUser}
                      onChange={(e) => setWpUser(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Admin Password *
                    </label>
                    <input
                      type="text"
                      value={wpPass}
                      onChange={(e) => setWpPass(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-xs text-blue-200">
                  Softaculous akan otomatis membuat database MySQL, mengonfigurasi file <code>wp-config.php</code>, dan menginstal paket WordPress siap pakai.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={wpInstalling}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{wpInstalling ? 'Memproses Instalasi WordPress...' : 'Instal WordPress Sekarang (1-Click)'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: SUBDOMAINS MANAGER */}
        {activeTab === 'subdomains' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Manajemen Subdomain (Virtual Hosts Tambahan)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Buat subdomain seperti <code>blog.{account.domain}</code> atau <code>api.{account.domain}</code> dengan document root direktori mandiri.
              </p>
            </div>

            {/* Create Subdomain Form */}
            <form onSubmit={handleCreateSubdomain} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              <div className="font-semibold text-xs text-slate-200">Tambah Subdomain Baru</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex items-center">
                  <input
                    type="text"
                    placeholder="nama subdomain (contoh: blog, dev, api)"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-l-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                  <div className="px-3 py-2 bg-slate-800 border border-l-0 border-slate-700 rounded-r-lg text-xs text-slate-300 font-mono whitespace-nowrap">
                    .{account.domain}
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={creatingSub}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{creatingSub ? 'Membuat...' : 'Buat Subdomain'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Subdomain List */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Subdomain</th>
                    <th className="py-2.5 px-3">Document Root</th>
                    <th className="py-2.5 px-3">IP Target</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {subdomains.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                        {loadingSubs ? 'Memuat subdomain...' : 'Belum ada subdomain kustom yang dibuat.'}
                      </td>
                    </tr>
                  ) : (
                    subdomains.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-white font-semibold">
                          <a href={`https://${sub.subdomain}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                            <span>{sub.subdomain}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{sub.root}</td>
                        <td className="py-2.5 px-3 text-slate-400">{sub.target}</td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            onClick={() => handleDeleteSubdomain(sub)}
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Hapus Subdomain"
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

        {/* TAB 4: WEB TERMINAL SSH */}
        {activeTab === 'terminal' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Web Terminal SSH Console</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sandbox shell interaktif untuk mengelola file, wp-cli, composer, dan konfigurasi server.
                </p>
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleExecuteCommand('ls -la')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono"
                >
                  ls -la
                </button>
                <button
                  onClick={() => handleExecuteCommand('php -v')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono"
                >
                  php -v
                </button>
                <button
                  onClick={() => handleExecuteCommand('wp --info')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono"
                >
                  wp --info
                </button>
                <button
                  onClick={() => handleExecuteCommand('df -h')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono"
                >
                  df -h
                </button>
                <button
                  onClick={() => setTermOutput([])}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[11px]"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Terminal Console Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 h-80 overflow-y-auto space-y-2">
              {termOutput.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  {item.cmd !== 'init' && (
                    <div className="text-emerald-400 flex items-center gap-1">
                      <span>{account.username}@{account.domain}:~$</span>
                      <span className="text-white">{item.cmd}</span>
                    </div>
                  )}
                  <div className="text-slate-400 whitespace-pre-wrap pl-2 leading-relaxed">
                    {item.out}
                  </div>
                </div>
              ))}
            </div>

            {/* Command Input Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative font-mono">
                <span className="absolute left-3 top-2 text-emerald-400 text-xs">$</span>
                <input
                  type="text"
                  placeholder="Ketik perintah (contoh: ls, composer -v, wp core version)..."
                  value={termCommand}
                  onChange={(e) => setTermCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteCommand();
                  }}
                  className="w-full pl-7 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <button
                onClick={() => handleExecuteCommand()}
                disabled={runningCmd}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{runningCmd ? 'Menjalankan...' : 'Eksekusi'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: ERROR LOGS */}
        {activeTab === 'logs' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Error & Access Logs Real-time</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pantau peristiwa HTTP server Apache/Nginx dan pesan error PHP untuk domain {account.domain}.
                </p>
              </div>
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>Segarkan Log</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 max-h-80 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-500 text-center py-6">Tidak ada catatan log error saat ini.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-slate-900 text-[11px]">
                    <span className="text-slate-400 whitespace-nowrap">[{log.timestamp.substring(11, 19)}]</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      log.level === 'NOTICE' ? 'bg-amber-950 text-amber-400' : 'bg-blue-950 text-blue-400'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: METRICS & LVE */}
        {activeTab === 'metrics' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>Monitoring Resource Penggunaan (CloudLinux LVE Analytics)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-[11px] text-slate-400">Penggunaan CPU</div>
                <div className="text-lg font-bold text-white font-mono mt-1">12% / 100%</div>
                <div className="text-[10px] text-emerald-400 mt-1">Normal (Batas Aman)</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-[11px] text-slate-400">Physical Memory (RAM)</div>
                <div className="text-lg font-bold text-white font-mono mt-1">184 MB / 1024 MB</div>
                <div className="text-[10px] text-emerald-400 mt-1">18% Terpakai</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-[11px] text-slate-400">IO Speed & IOPS</div>
                <div className="text-lg font-bold text-white font-mono mt-1">1.2 MB/s (120 IOPS)</div>
                <div className="text-[10px] text-blue-400 mt-1">NVMe High Performance</div>
              </div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="font-semibold text-slate-200">Batas Entry Processes (EP): 0 / 20</div>
              <div className="text-slate-400 leading-relaxed text-[11px]">
                Akun hosting ini terisolasi menggunakan CloudLinux CageFS & LVE Manager untuk memastikan performa website Anda stabil tanpa terganggu oleh pengguna lain pada server node yang sama.
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: phpMyAdmin Client */}
        {activeTab === 'phpmyadmin' && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>phpMyAdmin MySQL Web Interface</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Basis data aktif: <code>{account.username}_db</code> | Engine: MariaDB / InnoDB
                </p>
              </div>
              <button
                onClick={() => onOpenSubModal('db')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
              >
                Kelola Database & Hak Akses
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Status Server MySQL:</span>
                <span className="text-emerald-400 font-bold">127.0.0.1 via TCP/IP (Uptime: 99.99%)</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Database Default:</span>
                <span className="text-white font-bold">{account.username}_db</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">User MySQL Terkait:</span>
                <span className="text-white font-bold">{account.username}_usr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Charset & Collation:</span>
                <span className="text-white">utf8mb4_unicode_ci</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
