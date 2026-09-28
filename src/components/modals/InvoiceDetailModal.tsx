import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Invoice } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Receipt, CheckCircle, Wallet, QrCode, Building2, Printer } from 'lucide-react';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPaymentSuccess: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess
}) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useNotification();
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'qris' | 'bank_transfer'>('balance');

  if (!invoice) return null;

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await apiRequest(`/api/billing/invoices/${invoice.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ payment_method: paymentMethod })
      });

      await refreshUser();
      showToast('Pembayaran Lunas!', res.message, 'success');
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      showToast('Gagal memproses pembayaran', err.message, 'danger');
    } finally {
      setPaying(false);
    }
  };

  const isPaid = invoice.status === 'paid';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Faktur Tagihan #${invoice.invoice_number}`}
      subtitle={`Diterbitkan pada: ${new Date(invoice.created_at).toLocaleDateString('id-ID')}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Header Status & Amount */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-400">Total Tagihan</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums mt-0.5">
              Rp {invoice.total_amount.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Jatuh Tempo: {new Date(invoice.due_date).toLocaleDateString('id-ID')}
            </div>
          </div>
          <div>
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Customer & Item Details */}
        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">Ditujukan Kepada</span>
            <span className="font-semibold text-white">{invoice.user_name || 'Pelanggan'}</span>
          </div>
          {invoice.account_domain && (
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Layanan Domain</span>
              <span className="font-mono text-blue-400 font-medium">{invoice.account_domain}</span>
            </div>
          )}
          {invoice.package_name && (
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Paket Berlangganan</span>
              <span className="text-slate-200">{invoice.package_name}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">Biaya Paket Pokok</span>
            <span className="font-mono text-slate-200 tabular-nums">Rp {invoice.amount.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/80">
            <span className="text-slate-400">PPN (11%)</span>
            <span className="font-mono text-slate-200 tabular-nums">Rp {invoice.tax.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Payment Action Area if Unpaid */}
        {!isPaid ? (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Pilih Metode Pembayaran
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer ${
                  paymentMethod === 'balance'
                    ? 'bg-blue-950/30 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Potong Saldo Akun (Tersedia: Rp {(user?.balance || 0).toLocaleString('id-ID')})</span>
                </div>
                <input
                  type="radio"
                  name="inv_pay"
                  value="balance"
                  checked={paymentMethod === 'balance'}
                  onChange={() => setPaymentMethod('balance')}
                />
              </label>

              <label
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer ${
                  paymentMethod === 'qris'
                    ? 'bg-blue-950/30 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  <span>QRIS Gateway Real-time</span>
                </div>
                <input
                  type="radio"
                  name="inv_pay"
                  value="qris"
                  checked={paymentMethod === 'qris'}
                  onChange={() => setPaymentMethod('qris')}
                />
              </label>
            </div>

            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs shadow-sm transition-colors mt-2"
            >
              {paying ? 'Memproses Verifikasi Pembayaran...' : `Lunasi Sekarang (Rp ${invoice.total_amount.toLocaleString('id-ID')})`}
            </button>
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Tagihan ini telah dibayar lunas pada {invoice.paid_at ? new Date(invoice.paid_at).toLocaleString('id-ID') : 'sekarang'}.</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
