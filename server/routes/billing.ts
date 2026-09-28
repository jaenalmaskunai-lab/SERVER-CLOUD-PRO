import { Router } from 'express';
import { query, queryOne, run, transaction } from '../db/database';
import { requireRole } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List Invoices
router.get('/invoices', (req: any, res) => {
  const user = req.user;
  let sql = `
    SELECT i.*, 
           u.full_name as user_name, u.email as user_email,
           r.full_name as reseller_name,
           ha.domain as account_domain,
           hp.name as package_name
    FROM invoices i
    JOIN users u ON i.user_id = u.id
    LEFT JOIN users r ON i.reseller_id = r.id
    LEFT JOIN hosting_accounts ha ON i.hosting_account_id = ha.id
    LEFT JOIN hosting_packages hp ON i.package_id = hp.id
  `;

  const params: any[] = [];
  if (user.role === 'customer') {
    sql += ' WHERE i.user_id = ?';
    params.push(user.id);
  } else if (user.role === 'reseller') {
    sql += ' WHERE i.reseller_id = ? OR i.user_id = ?';
    params.push(user.id, user.id);
  }

  sql += ' ORDER BY i.id DESC';

  const invoices = query(sql, params);
  res.json(invoices);
});

// Pay Invoice (Direct / QRIS / Credit Card / Saldo Reseller)
router.post('/invoices/:id/pay', (req: any, res) => {
  const user = req.user;
  const id = Number(req.params.id);
  const { payment_method } = req.body;

  const invoice = queryOne<any>('SELECT * FROM invoices WHERE id = ?', [id]);
  if (!invoice) return res.status(404).json({ error: 'Tagihan tidak ditemukan' });

  if (invoice.status === 'paid') {
    return res.status(400).json({ error: 'Tagihan ini sudah lunas sebelumnya.' });
  }

  const method = payment_method || 'qris';

  transaction(() => {
    // If paying with reseller balance
    if (method === 'balance') {
      const payer = queryOne<any>('SELECT balance FROM users WHERE id = ?', [user.id]);
      if (!payer || payer.balance < invoice.total_amount) {
        throw new Error(`Saldo tidak mencukupi. Saldo Anda: Rp ${payer?.balance?.toLocaleString('id-ID') || 0}, Total tagihan: Rp ${invoice.total_amount.toLocaleString('id-ID')}`);
      }
      run('UPDATE users SET balance = balance - ? WHERE id = ?', [invoice.total_amount, user.id]);
      run(
        `INSERT INTO transactions (user_id, type, amount, description, reference_id)
         VALUES (?, 'purchase', ?, ?, ?)`,
        [user.id, -invoice.total_amount, `Pembayaran Tagihan ${invoice.invoice_number}`, invoice.invoice_number]
      );
    }

    // Mark invoice paid
    run(
      `UPDATE invoices SET status = 'paid', payment_method = ?, paid_at = datetime('now') WHERE id = ?`,
      [method, id]
    );

    // If hosting account was suspended, unsuspend it automatically
    if (invoice.hosting_account_id) {
      run(`UPDATE hosting_accounts SET status = 'active', suspended_reason = NULL WHERE id = ?`, [invoice.hosting_account_id]);
    }

    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'PAY_INVOICE', 'invoice', String(id), `Paid invoice ${invoice.invoice_number} via ${method}`);
  });

  res.json({
    success: true,
    message: `Pembayaran untuk invoice ${invoice.invoice_number} berhasil diverifikasi. Layanan aktif!`,
    invoiceNumber: invoice.invoice_number
  });
});

// Deposit Balance (Reseller or Customer)
router.post('/deposit', (req: any, res) => {
  const user = req.user;
  const { amount, payment_method } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount < 10000) {
    return res.status(400).json({ error: 'Nominal deposit minimal adalah Rp 10.000' });
  }

  const refId = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  transaction(() => {
    run('UPDATE users SET balance = balance + ? WHERE id = ?', [numAmount, user.id]);
    run(
      `INSERT INTO transactions (user_id, type, amount, description, reference_id)
       VALUES (?, 'deposit', ?, ?, ?)`,
      [user.id, numAmount, `Top-up Saldo via ${payment_method || 'QRIS Instant'}`, refId]
    );

    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DEPOSIT_BALANCE', 'transaction', refId, `Deposit Rp ${numAmount}`);
  });

  const updated = queryOne<{ balance: number }>('SELECT balance FROM users WHERE id = ?', [user.id]);
  res.json({
    success: true,
    message: `Deposit sebesar Rp ${numAmount.toLocaleString('id-ID')} berhasil ditambahkan ke saldo akun Anda.`,
    balance: updated?.balance || 0,
    referenceId: refId
  });
});

// Payment Gateway Webhook Simulator (Tripay / Midtrans / Xendit)
router.post('/webhook', (req: any, res) => {
  const { event, invoice_number, status } = req.body;

  if (event === 'payment.success' && invoice_number) {
    const inv = queryOne<any>('SELECT * FROM invoices WHERE invoice_number = ?', [invoice_number]);
    if (inv && inv.status !== 'paid') {
      transaction(() => {
        run(`UPDATE invoices SET status = 'paid', paid_at = datetime('now'), payment_method = 'gateway_webhook' WHERE id = ?`, [inv.id]);
        if (inv.hosting_account_id) {
          run(`UPDATE hosting_accounts SET status = 'active', suspended_reason = NULL WHERE id = ?`, [inv.hosting_account_id]);
        }
      });
      return res.json({ status: 'success', processed: true });
    }
  }

  res.json({ status: 'ignored', message: 'Webhook received' });
});

// List Transactions
router.get('/transactions', (req: any, res) => {
  const user = req.user;
  let sql = `
    SELECT t.*, u.full_name as user_name, u.role as user_role
    FROM transactions t
    JOIN users u ON t.user_id = u.id
  `;

  const params: any[] = [];
  if (user.role !== 'admin') {
    sql += ' WHERE t.user_id = ?';
    params.push(user.id);
  }

  sql += ' ORDER BY t.id DESC LIMIT 50';

  const txs = query(sql, params);
  res.json(txs);
});

export default router;
