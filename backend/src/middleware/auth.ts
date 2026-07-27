import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  cityId?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token de autenticação não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
};

// ── Níveis de acesso ──────────────────────────────────────────────────────────

/**
 * SUPER_ADMIN: acesso total ao painel administrativo e todas as cidades.
 */
export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Não autenticado' });
    return;
  }
  if (req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Acesso negado. Apenas Super Administradores.' });
    return;
  }
  next();
};

/**
 * ADMIN ou SUPER_ADMIN: pode criar/editar tasks e feedbacks.
 * OPERATOR não passa por aqui.
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Não autenticado' });
    return;
  }
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Acesso negado. Permissão de administrador necessária.' });
    return;
  }
  next();
};

// ── Multi-tenant ──────────────────────────────────────────────────────────────

/**
 * Valida acesso à cidade.
 * SUPER_ADMIN acessa tudo; outros precisam ter a cityId no JWT.
 */
export const validateCityAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Não autenticado' });
    return;
  }

  const cityId = req.params.cityId;
  if (!cityId) {
    res.status(400).json({ success: false, error: 'ID da cidade não fornecido' });
    return;
  }

  if (req.user.role === 'SUPER_ADMIN') {
    req.cityId = cityId;
    next();
    return;
  }

  if (!req.user.cityIds.includes(cityId)) {
    res.status(403).json({ success: false, error: 'Acesso negado. Você não tem permissão para acessar esta cidade.' });
    return;
  }

  req.cityId = cityId;
  next();
};
