import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Wallet, QrCode, CreditCard, Building2, CheckCircle2 } from 'lucide-react';

interface DepositBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositBalanceModal: React.FC<DepositBalanceModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useNotification();
  const [amount, setAmount] = useState('500000');
  const [method, setMethod] = useState('qris');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const presets = ['100000', '250000', '500000', '1000000', '2500000', '5000000'];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num < 10000) {
      showToast('Nominal tidak valid', 'Minimal top-up adalah Rp 10.000', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/api/billing/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: num,
          payment_method: method
        })
      });

      setSuccessData(res);
      await refreshUser();
      showToast('Deposit Berhasil!', res.message, 'success');
    } catch (err: any) {
      showToast('Gagal melakukan deposit', err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Top-up Saldo Kredit Cloud PRO"
      subtitle={`Saldo aktif saat ini: Rp ${(user?.balance || 0).toLocaleString('id-ID')}`}
      maxWidth="md"
    >
      {successData ? (
        <div className="text-center py-4 space-y-4 animate-fadeIn">
          <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base">Top-up Berhasil Diverifikasi!</h4>
            <p className="text-xs text-slate-400 mt-1">{successData.message}</p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
            <div>Ref ID: {successData.referenceId}</div>
            <div className="mt-1 text-emerald-400 font-bold">
              Saldo Baru: Rp {successData.balance.toLocaleString('id-ID')}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
          >
            Selesai
          </button>
        </div>
      ) : (
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Pilih Nominal Cepat (IDR)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`py-2 px-1 text-xs font-mono rounded-lg border text-center transition-colors ${
                    amount === p
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {Number(p).toLocaleString('id-ID')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Atau Masukkan Nominal Kustom
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-slate-800 border border-r-0 border-slate-700 rounded-l-lg text-xs text-slate-400 font-medium">
                Rp
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="10000"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-r-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Metode Pembayaran
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  method === 'qris'
                    ? 'bg-blue-950/30 border-blue-500/60 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  <span>QRIS Instant (GoPay, OVO, Dana, BCA, Mandiri)</span>
                </div>
                <input
                  type="radio"
                  name="method"
                  value="qris"
                  checked={method === 'qris'}
                  onChange={() => setMethod('qris')}
                />
              </label>

              <label
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  method === 'bank_transfer'
                    ? 'bg-blue-950/30 border-blue-500/60 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Virtual Account Bank (BCA, Mandiri, BNI, BRI)</span>
                </div>
                <input
                  type="radio"
                  name="method"
                  value="bank_transfer"
                  checked={method === 'bank_transfer'}
                  onChange={() => setMethod('bank_transfer')}
                />
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-sm"
            >
              {loading ? 'Memproses Gateway...' : `Bayar Rp ${Number(amount).toLocaleString('id-ID')}`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
