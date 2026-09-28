import express from 'express';
import { getDb } from './db/database';
import { authMiddleware } from './middleware/auth';

// Route imports
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import resellersRouter from './routes/resellers';
import customersRouter from './routes/customers';
import packagesRouter from './routes/packages';
import accountsRouter from './routes/accounts';
import serversRouter from './routes/servers';
import dnsRouter from './routes/dns';
import filesRouter from './routes/files';
import databasesRouter from './routes/databases';
import emailsRouter from './routes/emails';
import cronRouter from './routes/cron';
import backupsRouter from './routes/backups';
import billingRouter from './routes/billing';
import securityRouter from './routes/security';
import queueRouter from './routes/queue';
import whitelabelRouter from './routes/whitelabel';

export async function createExpressApp() {
  // Ensure database is initialized
  await getDb();

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic API status
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Cloud PRO Reseller Hosting Server', timestamp: new Date().toISOString() });
  });

  // Public/Auth routes
  app.use('/api/auth', authRouter);

  // Authenticated routes
  app.use('/api/dashboard', authMiddleware, dashboardRouter);
  app.use('/api/resellers', authMiddleware, resellersRouter);
  app.use('/api/customers', authMiddleware, customersRouter);
  app.use('/api/packages', authMiddleware, packagesRouter);
  app.use('/api/accounts', authMiddleware, accountsRouter);
  app.use('/api/servers', authMiddleware, serversRouter);
  app.use('/api/dns', authMiddleware, dnsRouter);
  app.use('/api/files', authMiddleware, filesRouter);
  app.use('/api/databases', authMiddleware, databasesRouter);
  app.use('/api/emails', authMiddleware, emailsRouter);
  app.use('/api/cron', authMiddleware, cronRouter);
  app.use('/api/backups', authMiddleware, backupsRouter);
  app.use('/api/billing', authMiddleware, billingRouter);
  app.use('/api/security', authMiddleware, securityRouter);
  app.use('/api/queue', authMiddleware, queueRouter);
  app.use('/api/whitelabel', authMiddleware, whitelabelRouter);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API Error]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}
