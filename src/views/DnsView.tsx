import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { Globe2, Search, Edit3, Shield, Wand2, Info } from 'lucide-react';
import { DnsEditorModal } from '../components/modals/DnsEditorModal';

export const DnsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected Zone for Editor Modal
  const [activeZone, setActiveZone] = useState<any | null>(null);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/dns/zones');
      setZones(data);
    } catch (err: any) {
      showToast('Gagal memuat zona DNS', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, [user?.role, user?.id]);

  const filtered = zones.filter((z) =>
    z.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-400" />
            <span>Manajemen Domain & DNS Zone Editor</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Konfigurasi records DNS: A, AAAA, CNAME, MX, TXT (SPF/DKIM), NS, dan integrasi template email instan.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari domain zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 w-56"
          />
        </div>
      </div>

      {/* Cluster Nameservers Info Box */}
      <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Nameserver Resmi Cluster Cloud PRO:</div>
            <div className="text-xs font-mono text-cyan-400 mt-0.5 flex items-center gap-3">
              <span>ns1.cloudpro.id (103.145.226.10)</span>
              <span>·</span>
              <span>ns2.cloudpro.id (139.180.208.45)</span>
            </div>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          Arahkan domain registrar Anda ke nameserver di atas agar website langsung tersambung.
        </div>
      </div>

      {/* DNS Zones Table */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Nama Domain</th>
              <th className="py-3 px-4 text-center">Jumlah Record</th>
              <th className="py-3 px-4">Authoritative Nameservers</th>
              <th className="py-3 px-4 text-center">Waktu Dibuat</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                  {loading ? 'Memuat DNS zone...' : 'Tidak ada DNS zone ditemukan.'}
                </td>
              </tr>
            ) : (
              filtered.map((z) => (
                <tr key={z.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white font-sans text-sm flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-cyan-400" />
                    <span>{z.domain}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[11px] tabular-nums">
                      {z.record_count || 7} Records
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    ns1.cloudpro.id, ns2.cloudpro.id
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                    {new Date(z.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => setActiveZone(z)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Buka Zone Editor</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DNS Editor Modal */}
      {activeZone && (
        <DnsEditorModal
          isOpen={Boolean(activeZone)}
          onClose={() => {
            setActiveZone(null);
            fetchZones();
          }}
          accountId={activeZone.hosting_account_id}
          domain={activeZone.domain}
        />
      )}
    </div>
  );
};
