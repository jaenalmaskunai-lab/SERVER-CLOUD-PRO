import React, { useState } from 'react';
import {
  Menu,
  ShieldCheck,
  ShieldOff,
  Wallet,
  RefreshCw,
  UserCheck,
  ChevronDown,
  Sun,
  Moon,
  Palette,
  LogOut,
  Sparkles,
  Server,
  Layers,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeType } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { apiRequest } from '../../lib/api';

interface HeaderProps {
  currentView: string;
  onToggleSidebar: () => void;
  onOpenDeposit: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onToggleSidebar, onOpenDeposit }) => {
  const { user, personas, switchRole, refreshUser, logout } = useAuth();
  const { theme, setTheme, isLight } = useTheme();
  const { showToast } = useNotification();

  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);

  const handleToggle2fa = async () => {
    setToggling2fa(true);
    try {
      const res = await apiRequest<{ success: boolean; two_factor_enabled: boolean }>('/api/auth/toggle-2fa', {
        method: 'POST'
      });
      await refreshUser();
      showToast(
        res.two_factor_enabled ? '2FA Diaktifkan' : '2FA Dinonaktifkan',
        res.two_factor_enabled ? 'Autentikasi dua faktor sekarang melindungi akun Anda.' : 'Autentikasi dua faktor dinonaktifkan.',
        res.two_factor_enabled ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('Gagal mengubah 2FA', err.message, 'danger');
    } finally {
      setToggling2fa(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'admin') return 'Super Administrator (Root)';
    if (role === 'reseller') return 'Reseller Partner (WHM)';
    return 'Pelanggan Hosting (cPanel)';
  };

  const themeOptions: Array<{ id: ThemeType; label: string; desc: string; icon: string }> = [
    { id: 'enterprise-light', label: 'Enterprise Light (Terang)', desc: 'Tampilan terang modern & bersih', icon: '☀️' },
    { id: 'cpanel-classic', label: 'cPanel Classic Light', desc: 'Aksen oranye khas cPanel / WHM', icon: '🟠' },
    { id: 'cyber-dark', label: 'Cyber Dark (Gelap)', desc: 'Tema gelap kontras tinggi', icon: '🌙' },
    { id: 'nordic-ocean', label: 'Nordic Ocean', desc: 'Tema terang bernuansa sejuk', icon: '🌊' }
  ];

  return (
    <header className={`sticky top-0 z-30 h-16 border-b backdrop-blur-md px-4 lg:px-8 flex items-center justify-between transition-colors ${
      isLight ? 'bg-white/95 border-slate-200 shadow-xs' : 'bg-slate-900/90 border-slate-800'
    }`}>
      {/* Zone 1: Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-lg lg:hidden transition-colors ${
            isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className={`hidden sm:flex items-center gap-2 text-xs font-medium ${
          isLight ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <span className="font-bold text-blue-600">Cloud PRO</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
          <span className={`capitalize font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>
            {currentView.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Zone 2: Role Switcher / Persona Segmented Control */}
      <div className={`flex items-center gap-1 p-1 rounded-xl border ${
        isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950 border-slate-800'
      }`}>
        <span className={`hidden md:inline px-2 text-[10px] font-bold uppercase tracking-wider ${
          isLight ? 'text-slate-500' : 'text-slate-400'
        }`}>
          Akses:
        </span>
        <button
          onClick={() => switchRole('admin')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            user?.role === 'admin'
              ? 'bg-blue-600 text-white shadow-xs'
              : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
          }`}
        >
          Root Admin
        </button>
        <button
          onClick={() => switchRole('reseller', 2)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            user?.role === 'reseller'
              ? 'bg-blue-600 text-white shadow-xs'
              : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
          }`}
        >
          Reseller
        </button>
        <button
          onClick={() => switchRole('customer', 4)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            user?.role === 'customer'
              ? 'bg-blue-600 text-white shadow-xs'
              : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
          }`}
        >
          Pelanggan
        </button>
      </div>

      {/* Zone 3: Actions, Theme Selector, Wallet & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Wallet / Balance */}
        <button
          onClick={onOpenDeposit}
          className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-medium transition-colors ${
            isLight
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
            Rp {(user?.balance || 0).toLocaleString('id-ID')}
          </span>
          <span className={`text-[10px] pl-1 border-l ${
            isLight ? 'border-slate-300 text-blue-600' : 'border-slate-700 text-blue-400'
          }`}>
            + Top-up
          </span>
        </button>

        {/* Theme Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Pilih Tema Tampilan (Terang / Gelap)"
          >
            <Palette className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline text-[11px] font-medium">Tema</span>
          </button>

          {showThemeDropdown && (
            <div
              className={`absolute right-0 mt-2 w-64 border rounded-2xl shadow-xl p-2 z-50 text-xs animate-fadeIn ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
              onClick={() => setShowThemeDropdown(false)}
            >
              <div className={`px-3 py-1.5 border-b mb-1 text-[11px] font-bold uppercase tracking-wider ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
              }`}>
                Pilihan Tema Profesional:
              </div>
              <div className="space-y-1">
                {themeOptions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      theme === t.id
                        ? (isLight ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-blue-600/20 text-blue-400 font-semibold')
                        : (isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300')
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t.icon}</span>
                      <div>
                        <div className="text-xs font-semibold">{t.label}</div>
                        <div className="text-[10px] text-slate-400">{t.desc}</div>
                      </div>
                    </div>
                    {theme === t.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2FA Status Toggle */}
        <button
          onClick={handleToggle2fa}
          disabled={toggling2fa}
          title={user?.two_factor_enabled ? '2FA Aktif' : '2FA Nonaktif'}
          className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-colors ${
            user?.two_factor_enabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : (isLight ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-800/50 border-slate-700/60 text-slate-400')
          }`}
        >
          {user?.two_factor_enabled ? (
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          ) : (
            <ShieldOff className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* User Persona & Logout Menu */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
            className={`flex items-center gap-2 p-1.5 rounded-xl border transition-colors text-left ${
              isLight ? 'hover:bg-slate-100 border-slate-200' : 'hover:bg-slate-800 border-slate-800'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:block text-xs">
              <div className="font-semibold text-slate-800 dark:text-white truncate max-w-[120px]">{user?.full_name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{getRoleLabel(user?.role)}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {showPersonaDropdown && (
            <div
              className={`absolute right-0 mt-2 w-72 border rounded-2xl shadow-2xl p-2 z-50 text-xs animate-fadeIn ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className={`px-3 py-2 border-b mb-1 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <div className="font-bold text-slate-900 dark:text-white">{user?.full_name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">{getRoleLabel(user?.role)}</div>
              </div>

              <div className="py-1">
                <div className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Ganti Akun Demo:
                </div>
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchRole(p.role, p.id);
                      setShowPersonaDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      user?.id === p.id
                        ? (isLight ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-blue-600/20 text-blue-300 font-semibold')
                        : (isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300')
                    }`}
                  >
                    <div>
                      <div className="font-medium">{p.full_name}</div>
                      <div className="text-[10px] text-slate-400">{p.company || p.role.toUpperCase()}</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Rp {p.balance.toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>

              {/* Logout button to return to Server Login Portal */}
              <div className={`pt-2 mt-1 border-t ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <button
                  onClick={() => {
                    setShowPersonaDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar ke Halaman Login Server</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
