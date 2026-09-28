import React, { useState, useEffect } from 'react';
import { useNotification } from '../../src/context/NotificationContext';
import { apiRequest } from '../lib/api';
import { QueueJobItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Cpu, Play, RefreshCw, Plus, CheckCircle2, Clock } from 'lucide-react';

export const QueueView: React.FC = () => {
  const { showToast } = useNotification();
  const [jobs, setJobs] = useState<QueueJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<QueueJobItem[]>('/api/queue/jobs');
      setJobs(data);
    } catch (err: any) {
      showToast('Gagal memuat antrean', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleProcessNext = async () => {
    setProcessing(true);
    try {
      const res = await apiRequest<{ processed: boolean; message?: string; job?: any }>('/api/queue/process-next', {
        method: 'POST'
      });

      if (res.processed) {
        showToast('Pekerjaan Antrean Selesai', `Tugas "${res.job.job_type}" berhasil dieksekusi.`, 'success');
      } else {
        showToast('Antrean Bersih', res.message || 'Semua pekerjaan telah selesai.', 'info');
      }
      fetchJobs();
    } catch (err: any) {
      showToast('Gagal memproses antrean', err.message, 'danger');
    } finally {
      setProcessing(false);
    }
  };

  const handleInjectTestJob = async () => {
    try {
      await apiRequest('/api/queue/enqueue-test', {
        method: 'POST',
        body: JSON.stringify({
          job_type: 'GENERATE_AUTO_SSL',
          payload: { domain: 'tokobajuonline.com', trigger: 'manual_evaluation' }
        })
      });
      showToast('Tugas Ditambahkan', 'Tugas GENERATE_AUTO_SSL masuk ke antrean.', 'info');
      fetchJobs();
    } catch (err: any) {
      showToast('Gagal enqueue test', err.message, 'danger');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span>Antrean Background Worker & Otomasi Sistem</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sistem asynchronous queue worker untuk tugas berat: provisi vhost, penerbitan SSL Let's Encrypt, backup kompresi, dan sinkronisasi DNS.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleInjectTestJob}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Enqueue Test Job</span>
          </button>

          <button
            onClick={handleProcessNext}
            disabled={processing}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
            <span>{processing ? 'Memproses Worker...' : 'Proses Antrean Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Queue Jobs Table */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">ID Job</th>
              <th className="py-3 px-4">Tipe Pekerjaan</th>
              <th className="py-3 px-4">Data Payload</th>
              <th className="py-3 px-4 text-center">Percobaan</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Waktu Selesai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                  {loading ? 'Memeriksa antrean...' : 'Tidak ada pekerjaan dalam antrean.'}
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-bold">
                    #{job.id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">
                    <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/50 text-blue-400 text-[11px]">
                      {job.job_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                    {job.payload}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-300 tabular-nums">
                    {job.attempts}x
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                    {job.completed_at ? new Date(job.completed_at).toLocaleTimeString('id-ID') : '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
