import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'ssl' | 'role' | 'job';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status' }) => {
  const normalized = status.toLowerCase();

  let colorClass = 'text-slate-400 bg-slate-800/60 border-slate-700/60';
  let dotClass = 'bg-slate-400';
  let label = status;

  if (normalized === 'active' || normalized === 'online' || normalized === 'paid' || normalized === 'completed') {
    colorClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
    dotClass = 'bg-emerald-400';
    label = normalized === 'active' ? 'Aktif' : (normalized === 'online' ? 'Online' : (normalized === 'paid' ? 'Lunas' : 'Selesai'));
  } else if (normalized === 'suspended' || normalized === 'offline' || normalized === 'failed' || normalized === 'cancelled') {
    colorClass = 'text-rose-400 bg-rose-950/40 border-rose-800/40';
    dotClass = 'bg-rose-400';
    label = normalized === 'suspended' ? 'Ditangguhkan' : (normalized === 'offline' ? 'Offline' : (normalized === 'failed' ? 'Gagal' : 'Dibatalkan'));
  } else if (normalized === 'unpaid' || normalized === 'pending' || normalized === 'processing' || normalized === 'degraded') {
    colorClass = 'text-amber-400 bg-amber-950/40 border-amber-800/40';
    dotClass = 'bg-amber-400';
    label = normalized === 'unpaid' ? 'Belum Bayar' : (normalized === 'pending' ? 'Tertunda' : (normalized === 'processing' ? 'Memproses' : 'Degraded'));
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </span>
  );
};
