import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { Invoice } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { InvoiceDetailModal } from '../components/modals/InvoiceDetailModal';
import { DepositBalanceModal } from '../components/modals/DepositBalanceModal';
import {
  Receipt,
  Wallet,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Plus,
  Send,
  CreditCard,
  Building2,
  Zap
} from 'lucide-react';

export const BillingView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions' | 'webhook'>('invoices');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  // Webhook simulator state
  const [webhookInvNum, setWebhookInvNum] = useState('');
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [invData, txData] = await Promise.all([
        apiRequest<Invoice[]>('/api/billing/invoices'),
        apiRequest<any[]>('/api/billing/transactions')
      ]);
      setInvoices(invData);
      setTransactions(txData);
      if (invData.length > 0 && !webhookInvNum) {
        setWebhookInvNum(invData[0].invoice_number);
      }
    } catch (err: any) {
      showToast('Gagal memuat billing', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [user?.role, user?.id]);

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookInvNum.trim()) return;

    setSimulatingWebhook(true);
    try {
      const res = await apiRequest('/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify({
          event: 'payment.success',
          invoice_number: webhookInvNum.trim(),
          status: 'paid'
        })
      });

      showToast('Webhook Payment Gateway Berhasil!', `Sinyal pembayaran untuk ${webhookInvNum} berhasil diproses backend.`, 'success');
      fetchBillingData();
    } catch (err: any) {
      showToast('Gagal simulasi webhook', err.message, 'danger');
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.account_domain && inv.account_domain.toLowerCase().includes(search.toLowerCase())) ||
      (inv.user_name && inv.user_name.toLowerCase().includes(search.toLowerCase()));

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && inv.status === filterStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <span>Billing, Faktur Tagihan & Pembayaran</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sistem penagihan otomatis berulang, verifikasi gateway instan (QRIS / VA Bank), dan buku kas transaksi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDepositOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Wallet className="w-4 h-4" />
            <span>+ Top-up Saldo Kredit</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'invoices'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Faktur Tagihan ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'transactions'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Riwayat Transaksi Ledger ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'webhook'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Simulator Webhook Gateway
          </button>
        </div>

        {activeTab === 'invoices' && (
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="unpaid">Belum Bayar</option>
              <option value="paid">Lunas</option>
            </select>
          </div>
        )}
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. Invoice</th>
                  <th className="py-3 px-4">Pelanggan & Domain</th>
                  <th className="py-3 px-4">Paket Layanan</th>
                  <th className="py-3 px-4 text-right">Total (PPN 11%)</th>
                  <th className="py-3 px-4 text-center">Jatuh Tempo</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                      {loading ? 'Memuat faktur...' : 'Tidak ada faktur tagihan ditemukan.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="text-slate-200 font-medium">{inv.user_name || 'Pelanggan'}</div>
                        <div className="text-[11px] text-blue-400 font-mono">{inv.account_domain || '--'}</div>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        {inv.package_name || 'Layanan Hosting'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm tabular-nums">
                        Rp {inv.total_amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                        {new Date(inv.due_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-medium transition-colors"
                        >
                          {inv.status === 'unpaid' ? 'Bayar Tagihan' : 'Lihat Faktur'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Ledger Tab */}
      {activeTab === 'transactions' && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Deskripsi Transaksi</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Ref ID</th>
                <th className="py-3 px-4 text-right">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    Belum ada catatan transaksi ledger.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200 font-sans">
                      {tx.description}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {tx.user_name}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-bold tabular-nums ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {tx.amount > 0 ? '+' : ''}Rp {tx.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                      {tx.reference_id || '--'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                      {new Date(tx.created_at).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Webhook Simulator Tab */}
      {activeTab === 'webhook' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Simulator Webhook Payment Gateway API</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fitur ini menguji penanganan sinyal pembayaran HTTP POST asynchronous dari provider Payment Gateway seperti <strong>Tripay</strong>, <strong>Midtrans</strong>, atau <strong>Xendit</strong>. Saat sinyal sukses diterima, status faktur otomatis berubah menjadi Lunas dan akun hosting yang ditangguhkan akan diaktifkan seketika.
          </p>

          <form onSubmit={handleSimulateWebhook} className="space-y-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nomor Invoice Target
              </label>
              <input
                type="text"
                placeholder="INV-2026-0041"
                value={webhookInvNum}
                onChange={(e) => setWebhookInvNum(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="p-3 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-400">
              Payload: &#123; "event": "payment.success", "invoice_number": "{webhookInvNum}", "status": "paid" &#125;
            </div>

            <button
              type="submit"
              disabled={simulatingWebhook}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{simulatingWebhook ? 'Mengirim Sinyal...' : 'Kirim Sinyal Webhook Instan'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          onPaymentSuccess={fetchBillingData}
        />
      )}

      {/* Deposit Modal */}
      {isDepositOpen && (
        <DepositBalanceModal
          isOpen={isDepositOpen}
          onClose={() => {
            setIsDepositOpen(false);
            fetchBillingData();
          }}
        />
      )}
    </div>
  );
};
