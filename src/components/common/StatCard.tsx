import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  change,
  changeType = 'neutral',
  icon
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition-colors shadow-sm">
      <div className="flex items-center justify-between text-slate-400 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {subValue}
          </span>
        )}
      </div>
      {change && (
        <div className="mt-2 text-xs flex items-center gap-1.5 font-medium">
          <span
            className={
              changeType === 'positive'
                ? 'text-emerald-400'
                : changeType === 'negative'
                ? 'text-rose-400'
                : 'text-slate-400'
            }
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
};
