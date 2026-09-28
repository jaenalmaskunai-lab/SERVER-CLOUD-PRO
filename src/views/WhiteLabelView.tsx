import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiRequest } from '../lib/api';
import { Palette, Globe, Mail, Save, Sparkles, Eye, ShieldCheck } from 'lucide-react';

export const WhiteLabelView: React.FC = () => {
  const { user, whiteLabel, updateWhiteLabel } = useAuth();
  const { showToast } = useNotification();

  const [brandName, setBrandName] = useState(whiteLabel?.brand_name || 'Nusantara Cloud');
  const [logoUrl, setLogoUrl] = useState(whiteLabel?.logo_url || '');
  const [accentColor, setAccentColor] = useState(whiteLabel?.accent_color || '#2563eb');
  const [customDomain, setCustomDomain] = useState(whiteLabel?.custom_domain || 'panel.nusantaracloud.com');
  const [supportEmail, setSupportEmail] = useState(whiteLabel?.support_email || 'support@nusantaracloud.com');
  const [invoiceFooter, setInvoiceFooter] = useState(whiteLabel?.invoice_footer || 'Terima kasih telah mempercayakan hosting Anda kepada kami.');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (whiteLabel) {
      setBrandName(whiteLabel.brand_name || '');
      setLogoUrl(whiteLabel.logo_url || '');
      setAccentColor(whiteLabel.accent_color || '#2563eb');
      setCustomDomain(whiteLabel.custom_domain || '');
      setSupportEmail(whiteLabel.support_email || '');
      setInvoiceFooter(whiteLabel.invoice_footer || '');
    }
  }, [whiteLabel]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateWhiteLabel({
        brand_name: brandName,
        logo_url: logoUrl,
        accent_color: accentColor,
        custom_domain: customDomain,
        support_email: supportEmail,
        invoice_footer: invoiceFooter
      });
      showToast('White Label Berhasil Disimpan', 'Identitas brand reseller telah diterapkan pada portal pelanggan Anda.', 'success');
    } catch (err: any) {
      showToast('Gagal menyimpan white label', err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <span>Kustomisasi White Label Reseller</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sembunyikan identitas provider utama dari pelanggan Anda. Tampilkan brand, logo, domain, dan warna tema Anda sendiri secara 100% mandiri.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama Brand Reseller *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nusantara Cloud"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Domain Kustom Panel Klien
                </label>
                <input
                  type="text"
                  placeholder="cp.domainanda.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Dukungan / Kontak
                </label>
                <input
                  type="email"
                  placeholder="bantuan@domainanda.com"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Warna Aksen Brand
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 p-0.5 bg-slate-950 border border-slate-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Catatan Kaki Faktur / Invoice
                </label>
                <textarea
                  rows={2}
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Terapkan Brand White Label'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Panel Mockup */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Pratinjau Portal Pelanggan</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                Live Preview
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              {/* Mockup Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-[10px]"
                    style={{ backgroundColor: accentColor }}
                  >
                    {brandName.substring(0, 2).toUpperCase() || 'CP'}
                  </div>
                  <span className="font-bold text-white text-xs">{brandName || 'Brand Anda'}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {customDomain || 'panel.brandanda.com'}
                </div>
              </div>

              {/* Mockup Body Card */}
              <div className="p-3 bg-slate-900 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-white">Selamat Datang di Client Area</div>
                <div className="text-[10px] text-slate-400">
                  Layanan hosting Anda aktif dengan performa tinggi.
                </div>
                <div className="pt-2 flex justify-between items-center text-[10px] border-t border-slate-800">
                  <span className="text-slate-400">Kontak:</span>
                  <span className="text-blue-400 font-mono">{supportEmail}</span>
                </div>
              </div>

              {/* Mockup Invoice Note */}
              <div className="p-2.5 bg-slate-900/60 rounded text-[10px] text-slate-400 italic">
                "{invoiceFooter}"
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-xs text-blue-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="text-[11px]">
              Pelanggan Anda tidak akan melihat nama Cloud PRO di portal maupun invoice mereka.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
