import { Router } from 'express';
import { queryOne, run } from '../db/database';
import { requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// Get Reseller White Label Config
router.get('/', (req: any, res) => {
  const user = req.user;
  const resellerId = user.role === 'reseller' ? user.id : (user.reseller_id || 2);
  const settings = queryOne('SELECT * FROM reseller_settings WHERE user_id = ?', [resellerId]);
  res.json(settings || {
    brand_name: 'Cloud PRO Hosting',
    logo_url: '',
    favicon_url: '',
    accent_color: '#2563eb',
    custom_domain: 'panel.cloudpro.id',
    support_email: 'support@cloudpro.id',
    invoice_footer: 'Terima kasih atas kepercayaan Anda.'
  });
});

// Update Reseller White Label Config
router.put('/', requireRole(['reseller', 'admin']), (req: any, res) => {
  const user = req.user;
  const targetUserId = user.role === 'reseller' ? user.id : Number(req.body.user_id || 2);
  const { brand_name, logo_url, favicon_url, accent_color, custom_domain, support_email, invoice_footer } = req.body;

  const existing = queryOne('SELECT id FROM reseller_settings WHERE user_id = ?', [targetUserId]);

  if (existing) {
    run(
      `UPDATE reseller_settings 
       SET brand_name = ?, logo_url = ?, favicon_url = ?, accent_color = ?, custom_domain = ?, support_email = ?, invoice_footer = ?
       WHERE user_id = ?`,
      [brand_name, logo_url || '', favicon_url || '', accent_color || '#2563eb', custom_domain || '', support_email || '', invoice_footer || '', targetUserId]
    );
  } else {
    run(
      `INSERT INTO reseller_settings (user_id, brand_name, logo_url, favicon_url, accent_color, custom_domain, support_email, invoice_footer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [targetUserId, brand_name, logo_url || '', favicon_url || '', accent_color || '#2563eb', custom_domain || '', support_email || '', invoice_footer || '']
    );
  }

  recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'UPDATE_WHITELABEL', 'reseller_settings', String(targetUserId), `Brand updated: ${brand_name}`);
  res.json({ success: true, brand_name });
});

export default router;
