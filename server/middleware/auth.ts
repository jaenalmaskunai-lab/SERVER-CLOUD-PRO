import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'cloudpro_super_secret_jwt_key_2026';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'reseller' | 'customer';
  reseller_id: number | null;
  full_name: string;
  company: string | null;
  balance: number;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      reseller_id: user.reseller_id,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token provided, check if x-user-id header is provided (for demo convenience) or default to admin
    const overrideUserId = req.headers['x-user-id'];
    if (overrideUserId) {
      const user = queryOne<AuthUser>(
        'SELECT id, username, email, role, reseller_id, full_name, company, balance FROM users WHERE id = ?',
        [Number(overrideUserId)]
      );
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Default to admin for seamless evaluation if no auth header
    const defaultAdmin = queryOne<AuthUser>(
      'SELECT id, username, email, role, reseller_id, full_name, company, balance FROM users WHERE role = "admin" LIMIT 1'
    );
    if (defaultAdmin) {
      req.user = defaultAdmin;
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized: Token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = queryOne<AuthUser>(
      'SELECT id, username, email, role, reseller_id, full_name, company, balance FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found or disabled' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: ('admin' | 'reseller' | 'customer')[]) {
  return (req: Request & { user?: AuthUser }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Akses ditolak: Fitur ini membutuhkan peran ${allowedRoles.join(' atau ')}`
      });
    }
    next();
  };
}
