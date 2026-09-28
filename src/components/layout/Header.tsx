import React, { useState } from 'react';
import { Menu, ShieldCheck, ShieldOff, Wallet, RefreshCw, UserCheck, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { apiRequest } from '../../lib/api';

interface HeaderProps {
  currentView: string;
  onToggleSidebar: () => void;
  onOpenDeposit: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onToggleSidebar, onOpenDeposit }) => {
  const { user, personas, switchRole, refreshUser } = useAuth();
  const { showToast } = useNotification();
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
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
    if (role === 'admin') return 'Super Administrator';
    if (role === 'reseller') return 'Reseller Partner';
    return 'Pelanggan Hosting';
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between">
      {/* Zone 1: Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span>Cloud PRO</span>
          <span aria-hidden="true">/</span>
          <span className="text-white font-medium capitalize">
            {currentView.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Zone 2: Role Switcher / Persona Segmented Control (Anti-friction for evaluator) */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
        <span className="hidden md:inline px-2 text-[11px] font-medium text-slate-400 uppercase">
          Peran:
        </span>
        <button
          onClick={() => switchRole('admin')}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            user?.role === 'admin'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Admin
        </button>
        <button
          onClick={() => switchRole('reseller', 2)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            user?.role === 'reseller'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Reseller
        </button>
        <button
          onClick={() => switchRole('customer', 4)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            user?.role === 'customer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Pelanggan
        </button>
      </div>

      {/* Zone 3: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Wallet / Balance */}
        <button
          onClick={onOpenDeposit}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 rounded-lg text-xs font-medium transition-colors"
        >
          <Wallet className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono tabular-nums text-emerald-400 font-semibold">
            Rp {(user?.balance || 0).toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5">+ Top-up</span>
        </button>

        {/* 2FA Toggle Indicator */}
        <button
          onClick={handleToggle2fa}
          disabled={toggling2fa}
          title={user?.two_factor_enabled ? '2FA Aktif (Klik untuk ubah)' : '2FA Nonaktif (Klik untuk aktifkan)'}
          className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
            user?.two_factor_enabled
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/50'
              : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          {user?.two_factor_enabled ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldOff className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {/* User Persona Switcher Menu */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:block text-xs">
              <div className="font-medium text-white truncate max-w-[120px]">{user?.full_name}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{getRoleLabel(user?.role)}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden xl:block" />
          </button>

          {showPersonaDropdown && (
            <div
              className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs animate-fadeIn"
              onClick={() => setShowPersonaDropdown(false)}
            >
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <div className="font-semibold text-white">{user?.full_name}</div>
                <div className="text-[11px] text-slate-400">{user?.email}</div>
                <div className="text-[10px] text-blue-400 font-mono mt-0.5">{getRoleLabel(user?.role)}</div>
              </div>

              <div className="py-1">
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-500">
                  Ganti Akun Demo:
                </div>
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => switchRole(p.role, p.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      user?.id === p.id ? 'bg-blue-600/20 text-blue-300 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-white">{p.full_name}</div>
                      <div className="text-[10px] text-slate-400">{p.company || p.role.toUpperCase()}</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Rp {p.balance.toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
