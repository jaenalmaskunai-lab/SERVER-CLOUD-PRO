import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Server,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle,
  KeyRound,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Globe2,
  HardDrive,
  Users2,
  AlertCircle
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, switchRole } = useAuth();
  const { theme, setTheme, isLight, toggleTheme } = useTheme();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Cloudpro123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Harap isi username dan kata sandi server Anda.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await login(username.trim(), password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kredensial login tidak valid. Pastikan username dan password benar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (role: 'admin' | 'reseller' | 'customer', userToSet: string) => {
    setUsername(userToSet);
    setPassword('Cloudpro123!');
    setSubmitting(true);
    setErrorMsg('');
    try {
      if (role === 'admin') await switchRole('admin');
      if (role === 'reseller') await switchRole('reseller', 2);
      if (role === 'customer') await switchRole('customer', 4);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk akun demo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Top Bar: Server Hostname & Status */}
      <header className={`px-4 lg:px-8 py-3.5 border-b flex items-center justify-between text-xs ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-semibold text-xs">
              srv-jkt01.cloudpro.id:2087
            </span>
          </div>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-500 font-mono">
            WHM & cPanel Secure Gateway (Port 2083/2087)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Theme Switcher */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Ganti Mode Tampilan Terang/Gelap"
          >
            {isLight ? <Moon className="w-3.5 h-3.5 text-slate-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="capitalize">{isLight ? 'Mode Gelap' : 'Mode Terang'}</span>
          </button>
        </div>
      </header>

      {/* Main Login Form Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-1 font-black text-2xl tracking-tighter">
              CP
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Cloud PRO Web Hosting
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Masuk ke akun Root Administrator, Konsol Reseller WHM, atau Area Klien cPanel.
            </p>
          </div>

          {/* Login Card */}
          <div className={`p-6 sm:p-8 rounded-2xl border shadow-xl ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-black/50'
          }`}>
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                  Username atau Alamat Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin, reseller_nusantara, ahmad_dev"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kata Sandi Server
                  </label>
                  <span className="text-[11px] text-blue-600 hover:underline cursor-pointer">
                    Lupa Password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span>Ingat sesi ini (30 hari)</span>
                </label>
                <span className="text-[11px] font-mono text-emerald-600 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-bit TLS</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <KeyRound className="w-4 h-4" />
                <span>{submitting ? 'Mengautentikasi Server...' : 'Masuk ke Server Hosting'}</span>
              </button>
            </form>

            {/* Quick 1-Click Role Selector for Evaluation */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
                Pilih Akun Demo / Akses Cepat:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin', 'admin')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    username === 'admin'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-semibold'
                      : isLight ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-base mb-0.5">👑</div>
                  <div className="text-[11px] font-bold">Root Admin</div>
                  <div className="text-[9px] text-slate-400">Full Cluster</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('reseller', 'reseller_nusantara')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    username === 'reseller_nusantara'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-semibold'
                      : isLight ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-base mb-0.5">💼</div>
                  <div className="text-[11px] font-bold">Reseller</div>
                  <div className="text-[9px] text-slate-400">WHM Panel</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('customer', 'ahmad_dev')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    username === 'ahmad_dev'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-semibold'
                      : isLight ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-base mb-0.5">🌐</div>
                  <div className="text-[11px] font-bold">Pelanggan</div>
                  <div className="text-[9px] text-slate-400">cPanel Client</div>
                </button>
              </div>
            </div>
          </div>

          {/* Security & Cluster Telemetry Badges */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 font-mono">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Apache / Nginx</span>
              <span>HTTP/2 & HTTP/3</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">MariaDB 11.2</span>
              <span>MySQL Engine</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">PHP 7.4 - 8.4</span>
              <span>FastCGI / FPM</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`px-4 py-4 text-center text-xs border-t ${
        isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-500'
      }`}>
        <p>
          Cloud PRO Server Infrastructure Control &bull; Powered by Ubuntu 24.04 LTS &bull; cPHulk Brute Force Protection Active
        </p>
      </footer>
    </div>
  );
};
