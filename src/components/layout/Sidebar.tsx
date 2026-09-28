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
  Activity,
  Layers,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'reseller' | 'customer'>;
  badge?: string;
  iconBg: string;
  iconColor: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const { user, whiteLabel } = useAuth();
  const { isLight } = useTheme();
  const role = user?.role || 'admin';

  // Apply custom reseller branding if tenant is reseller or customer under reseller
  const brandName = (role !== 'admin' && whiteLabel?.brand_name) ? whiteLabel.brand_name : 'Cloud PRO';

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Pusat Kontrol Hosting',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Server',
          icon: LayoutDashboard,
          roles: ['admin', 'reseller', 'customer'],
          iconBg: 'bg-blue-500/10 text-blue-500',
          iconColor: 'text-blue-500'
        },
        {
          id: 'accounts',
          label: role === 'customer' ? 'Website & cPanel' : 'Akun Hosting (WHM)',
          icon: HardDrive,
          roles: ['admin', 'reseller', 'customer'],
          badge: 'cPanel',
          iconBg: 'bg-orange-500/10 text-orange-500',
          iconColor: 'text-orange-500'
        },
        {
          id: 'dns',
          label: 'Domain & Zona DNS',
          icon: Globe2,
          roles: ['admin', 'reseller', 'customer'],
          badge: 'DNS',
          iconBg: 'bg-cyan-500/10 text-cyan-500',
          iconColor: 'text-cyan-500'
        }
      ]
    },
    {
      groupTitle: 'Manajemen Klien (WHM)',
      items: [
        {
          id: 'resellers',
          label: 'Manajemen Reseller',
          icon: Users2,
          roles: ['admin'],
          iconBg: 'bg-indigo-500/10 text-indigo-500',
          iconColor: 'text-indigo-500'
        },
        {
          id: 'customers',
          label: 'Manajemen Pelanggan',
          icon: UserCheck,
          roles: ['admin', 'reseller'],
          iconBg: 'bg-emerald-500/10 text-emerald-500',
          iconColor: 'text-emerald-500'
        },
        {
          id: 'packages',
          label: 'Paket Hosting',
          icon: Package,
          roles: ['admin', 'reseller'],
          iconBg: 'bg-purple-500/10 text-purple-500',
          iconColor: 'text-purple-500'
        }
      ]
    },
    {
      groupTitle: 'Infrastruktur & Automasi',
      items: [
        {
          id: 'servers',
          label: 'Server & Node Cluster',
          icon: Server,
          roles: ['admin'],
          badge: '3 Node',
          iconBg: 'bg-amber-500/10 text-amber-500',
          iconColor: 'text-amber-500'
        },
        {
          id: 'queue',
          label: 'Antrean Automasi',
          icon: Cpu,
          roles: ['admin', 'reseller'],
          badge: 'Queue',
          iconBg: 'bg-violet-500/10 text-violet-500',
          iconColor: 'text-violet-500'
        }
      ]
    },
    {
      groupTitle: 'Keuangan & Pengaturan',
      items: [
        {
          id: 'billing',
          label: 'Billing & Invoice',
          icon: Receipt,
          roles: ['admin', 'reseller', 'customer'],
          iconBg: 'bg-teal-500/10 text-teal-500',
          iconColor: 'text-teal-500'
        },
        {
          id: 'security',
          label: 'Keamanan & Audit',
          icon: ShieldAlert,
          roles: ['admin', 'reseller', 'customer'],
          iconBg: 'bg-rose-500/10 text-rose-500',
          iconColor: 'text-rose-500'
        },
        {
          id: 'whitelabel',
          label: 'White Label Brand',
          icon: Palette,
          roles: ['admin', 'reseller'],
          iconBg: 'bg-pink-500/10 text-pink-500',
          iconColor: 'text-pink-500'
        },
        {
          id: 'api-docs',
          label: 'API & Arsitektur',
          icon: FileCode2,
          roles: ['admin', 'reseller', 'customer'],
          badge: 'REST',
          iconBg: 'bg-slate-500/10 text-slate-500',
          iconColor: 'text-slate-500'
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 border-r ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand Area */}
        <div className={`h-16 flex items-center px-5 border-b gap-3 ${
          isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900'
        }`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20 text-sm">
            CP
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-sm tracking-tight block truncate">
              {brandName}
            </span>
            <span className={`text-[10px] uppercase font-mono tracking-wider block truncate ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {role === 'admin' ? 'Root WHM Panel' : (role === 'reseller' ? 'Reseller Console' : 'cPanel Client')}
            </span>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map((group) => {
            const filteredGroupItems = group.items.filter((item) => item.roles.includes(role));
            if (filteredGroupItems.length === 0) return null;

            return (
              <div key={group.groupTitle} className="space-y-1">
                <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {group.groupTitle}
                </div>

                {filteredGroupItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-xl transition-all text-left group ${
                        isActive
                          ? (isLight
                              ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs border border-blue-200/60'
                              : 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30')
                          : (isLight
                              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60')
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-105 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : (isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800/80 text-slate-300')
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : (item.badge === 'cPanel'
                                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400')
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Node Health Quick Status */}
        <div className={`p-3.5 border-t text-xs ${
          isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/40 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-1 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Node ID-JKT-01</span>
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">99.98%</span>
          </div>
          <div className={`w-full rounded-full h-1.5 overflow-hidden mt-1.5 ${
            isLight ? 'bg-slate-200' : 'bg-slate-800'
          }`}>
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '28%' }} />
          </div>
          <div className={`flex justify-between items-center text-[10px] mt-1.5 font-mono ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <span>CPU: 28%</span>
            <span>RAM: 24.2 GB</span>
            <span className="text-blue-500 font-semibold">TLS 1.3</span>
          </div>
        </div>
      </aside>
    </>
  );
};
