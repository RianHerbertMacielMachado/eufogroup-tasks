export interface JwtPayload {
  userId: string;
  discordId: string;
  name: string;
  role: string;
  cityIds: string[];
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  cityId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';
export type BgMode = 'STATIC' | 'CAROUSEL';
