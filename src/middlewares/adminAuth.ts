/**
 * Admin authentication middleware — verifies admin JWT and attaches admin + permissions to request.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AdminUser } from '../models/AdminUser';
import { Role } from '../models/Role';
import { IPermission } from '../models/Permission';
import { ApiError } from '../utils/ApiError';

export interface AdminAuthPayload {
  adminId: string;
  email: string;
}

export interface AdminContext {
  id: string;
  email: string;
  name: string;
  roleSlug: string;
  roleName: string;
  permissionCodes: Set<string>;
}

// Extend Express Request for admin context
declare global {
  namespace Express {
    interface Request {
      admin?: AdminContext;
    }
  }
}

/**
 * Authenticate admin — validates JWT, loads role + permissions, attaches to req.admin.
 */
export const authenticateAdmin = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  let decoded: AdminAuthPayload;
  try {
    decoded = jwt.verify(token, config.jwt.accessSecret) as AdminAuthPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired admin token');
  }

  const admin = await AdminUser.findById(decoded.adminId);
  if (!admin || !admin.isActive) {
    throw ApiError.unauthorized('Admin account not found or deactivated');
  }

  const role = await Role.findById(admin.role).populate<{ permissions: IPermission[] }>('permissions');
  if (!role) {
    throw ApiError.forbidden('No role assigned');
  }

  const permissionCodes = new Set(role.permissions.map((p) => p.code));

  req.admin = {
    id: admin._id.toString(),
    email: admin.email,
    name: admin.name,
    roleSlug: role.slug,
    roleName: role.name,
    permissionCodes,
  };

  next();
};

/**
 * RBAC permission check — ensures the authenticated admin has ALL required permissions.
 * SUPER_ADMIN role bypasses all permission checks.
 */
export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.admin) {
      throw ApiError.unauthorized('Admin authentication required');
    }

    // SUPER_ADMIN bypasses all permission checks
    if (req.admin.roleSlug === 'SUPER_ADMIN') {
      return next();
    }

    const missing = requiredPermissions.filter((p) => !req.admin!.permissionCodes.has(p));
    if (missing.length > 0) {
      throw ApiError.forbidden(`Missing permissions: ${missing.join(', ')}`);
    }

    next();
  };
};
