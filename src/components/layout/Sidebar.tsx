import React from 'react';
import {
  LayoutDashboard,
  Users2,
  UserCheck,
  Server,
  Globe2,
  HardDrive,
  Package,
  Receipt,
  ShieldAlert,
  Cpu,
  Palette,
  FileCode2,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const { user, whiteLabel } = useAuth();
  const role = user?.role || 'admin';

  // Apply custom reseller branding if tenant is reseller or customer under reseller
  const brandName = (role !== 'admin' && whiteLabel?.brand_name) ? whiteLabel.brand_name : 'Cloud PRO';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'reseller', 'customer'] },
    { id: 'resellers', label: 'Manajemen Reseller', icon: Users2, roles: ['admin'] },
    { id: 'customers', label: 'Manajemen Pelanggan', icon: UserCheck, roles: ['admin', 'reseller'] },
    { id: 'accounts', label: 'Akun Hosting', icon: HardDrive, roles: ['admin', 'reseller', 'customer'] },
    { id: 'packages', label: 'Paket Hosting', icon: Package, roles: ['admin', 'reseller'] },
    { id: 'servers', label: 'Server & Node', icon: Server, roles: ['admin'] },
    { id: 'dns', label: 'Domain & DNS', icon: Globe2, roles: ['admin', 'reseller', 'customer'] },
    { id: 'billing', label: 'Billing & Invoice', icon: Receipt, roles: ['admin', 'reseller', 'customer'] },
    { id: 'security', label: 'Keamanan & Audit', icon: ShieldAlert, roles: ['admin', 'reseller', 'customer'] },
    { id: 'queue', label: 'Antrean Automasi', icon: Cpu, roles: ['admin', 'reseller'] },
    { id: 'whitelabel', label: 'White Label Brand', icon: Palette, roles: ['admin', 'reseller'] },
    { id: 'api-docs', label: 'API & Arsitektur', icon: FileCode2, roles: ['admin', 'reseller', 'customer'] }
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Area */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            CP
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-base tracking-tight text-white block truncate">
              {brandName}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block truncate">
              {role === 'admin' ? 'Root Admin Panel' : (role === 'reseller' ? 'Reseller Console' : 'Customer Client Area')}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Utama
          </div>
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-left ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Node Health Quick Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Node ID-JKT-01</span>
            </span>
            <span className="font-mono tabular-nums text-slate-400">99.98%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden mt-1.5">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '28%' }} />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
            <span>CPU 28%</span>
            <span>RAM 37%</span>
          </div>
        </div>
      </aside>
    </>
  );
};
