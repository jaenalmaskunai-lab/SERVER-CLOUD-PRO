import { Request, Response, NextFunction } from 'express';
import { run } from '../db/database';
import { AuthUser } from './auth';

export function recordAuditLog(
  userId: number | null,
  userRole: string,
  ipAddress: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: string
) {
  try {
    run(
      `INSERT INTO audit_logs (user_id, user_role, ip_address, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userRole, ipAddress || '127.0.0.1', action, entityType, entityId, details]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function auditMiddleware(actionName: string, entityType: string) {
  return (req: Request & { user?: AuthUser }, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id ?? null;
        const role = req.user?.role ?? 'system';
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const entityId = req.params.id || body?.id || body?.account_id || null;
        const details = JSON.stringify({
          method: req.method,
          path: req.originalUrl,
          bodySummary: req.body ? Object.keys(req.body) : []
        });

        recordAuditLog(userId, role, ip, actionName, entityType, entityId ? String(entityId) : null, details);
      }
      return originalJson(body);
    };
    next();
  };
}
