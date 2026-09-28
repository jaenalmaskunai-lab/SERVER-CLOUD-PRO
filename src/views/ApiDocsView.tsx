import React, { useState } from 'react';
import { FileCode2, Play, Copy, Check, Terminal, ExternalLink, Shield } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useNotification } from '../context/NotificationContext';

export const ApiDocsView: React.FC = () => {
  const { showToast } = useNotification();
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState(0);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const endpoints = [
    {
      method: 'GET',
      path: '/api/accounts',
      title: 'List All Hosting Accounts',
      desc: 'Mengambil seluruh daftar virtual host akun hosting sesuai hak akses peran (Admin/Reseller/Customer).',
      samplePayload: null
    },
    {
      method: 'POST',
      path: '/api/accounts',
      title: 'Auto-Provision Hosting Account',
      desc: 'Memprovisi akun hosting baru secara otomatis, mencakup alokasi folder vhost, DNS standard zone, sertifikat SSL Let\'s Encrypt, dan akun email webmaster.',
      samplePayload: JSON.stringify(
        {
          customer_id: 4,
          server_id: 1,
          package_id: 5,
          domain: 'tokobaru-demo.com',
          username: 'tokobaru',
          php_version: '8.3'
        },
        null,
        2
      )
    },
    {
      method: 'GET',
      path: '/api/servers',
      title: 'Cluster Server Telemetry & Status',
      desc: 'Mengambil metrik live CPU, RAM, Disk, beban server, serta status systemd services (Nginx, MariaDB, PHP-FPM, BIND9, Fail2ban).',
      samplePayload: null
    },
    {
      method: 'POST',
      path: '/api/billing/webhook',
      title: 'Payment Gateway Webhook Receiver',
      desc: 'Endpoint publik untuk menerima notifikasi IPN / webhook dari Payment Gateway (Tripay / Midtrans / Xendit).',
      samplePayload: JSON.stringify(
        {
          event: 'payment.success',
          invoice_number: 'INV-2026-0041',
          status: 'paid'
        },
        null,
        2
      )
    },
    {
      method: 'GET',
      path: '/api/dns/zones',
      title: 'DNS Zone Registry',
      desc: 'Mendaftar seluruh domain authoritative zones yang dikelola oleh nameserver BIND9 cluster.',
      samplePayload: null
    },
    {
      method: 'GET',
      path: '/api/security/audit-logs',
      title: 'Immutable Audit Trail',
      desc: 'Mengambil riwayat kejadian keamanan dan audit log dengan pencatatan IP, aksi, dan aktor.',
      samplePayload: null
    }
  ];

  const current = endpoints[selectedEndpointIndex];

  const handleTestEndpoint = async () => {
    setTesting(true);
    setTestOutput(null);
    try {
      const options: RequestInit = {
        method: current.method
      };
      if (current.samplePayload && current.method === 'POST') {
        options.body = current.samplePayload;
      }

      const res = await apiRequest(current.path, options);
      setTestOutput(JSON.stringify(res, null, 2));
      showToast('API Eksekusi Sukses', `${current.method} ${current.path}`, 'success');
    } catch (err: any) {
      setTestOutput(JSON.stringify({ error: err.message }, null, 2));
      showToast('API Eksekusi Gagal', err.message, 'danger');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-blue-400" />
            <span>Dokumentasi REST API & Interactive Explorer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Integrasikan panel Cloud PRO dengan WHMCS, Blesta, WooCommerce, atau sistem billing kustom Anda menggunakan RESTful API.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Bearer Token Auth · JSON Encoded</span>
        </div>
      </div>

      {/* Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint List */}
        <div className="space-y-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="px-2 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Endpoints Tersedia
          </div>
          {endpoints.map((ep, idx) => {
            const isSelected = selectedEndpointIndex === idx;
            return (
              <button
                key={`${ep.method}-${ep.path}`}
                onClick={() => {
                  setSelectedEndpointIndex(idx);
                  setTestOutput(null);
                }}
                className={`w-full p-3 rounded-xl text-left transition-colors border ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/40 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      ep.method === 'GET'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-medium truncate">{ep.path}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">{ep.title}</div>
              </button>
            );
          })}
        </div>

        {/* Endpoint Tester Console */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    current.method === 'GET'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-blue-950 text-blue-400 border border-blue-800'
                  }`}
                >
                  {current.method}
                </span>
                <h3 className="text-sm font-bold text-white font-mono">{current.path}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">{current.desc}</p>
            </div>

            <button
              onClick={handleTestEndpoint}
              disabled={testing}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Play className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Menguji API...' : 'Kirim Request'}</span>
            </button>
          </div>

          {/* Sample cURL command */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Contoh Permintaan cURL
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
{`curl -X ${current.method} "https://cloudpro.id${current.path}" \\
  -H "Authorization: Bearer cpro_live_token_anda" \\
  -H "Content-Type: application/json"${current.samplePayload ? ` \\\n  -d '${current.samplePayload.replace(/\n/g, '')}'` : ''}`}
            </pre>
          </div>

          {/* Response Inspector */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Response Output JSON
            </div>
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 max-h-72 overflow-y-auto leading-relaxed">
              {testOutput || '// Klik tombol "Kirim Request" di atas untuk mengeksekusi endpoint live.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
