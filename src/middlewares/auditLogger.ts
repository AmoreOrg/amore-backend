/**
 * Audit logging middleware — records all admin API actions to AuditLog collection.
 * Attached after authenticateAdmin so req.admin is available.
 * Sanitizes sensitive fields from request body before logging.
 */
import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import logger from '../utils/logger';

const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword', 'refreshToken', 'token'];

function sanitizeBody(body: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Derive a human-readable action string from HTTP method and route path.
 */
function deriveAction(method: string, path: string): string {
  const segments = path.replace(/^\/api\/v1\/admin\/?/, '').split('/').filter(Boolean);
  const resource = segments[0] || 'admin';
  const subAction = segments.find((s) => !s.match(/^[a-f0-9]{24}$/i) && s !== resource) || '';

  const methodMap: Record<string, string> = {
    GET: 'view',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };

  const action = methodMap[method.toUpperCase()] || method.toLowerCase();
  return subAction ? `${resource}.${subAction}` : `${resource}.${action}`;
}

/**
 * Extract resource type and resource ID from the request path.
 */
function extractResource(path: string): { resource: string; resourceId?: string } {
  const segments = path.replace(/^\/api\/v1\/admin\/?/, '').split('/').filter(Boolean);
  const resource = segments[0] || 'admin';
  const resourceId = segments.find((s) => s.match(/^[a-f0-9]{24}$/i));
  return { resource, resourceId };
}

export const auditLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Only log if admin is authenticated
  if (!req.admin) {
    return next();
  }

  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  // Intercept response to capture status code
  res.json = function (body: any) {
    const { resource, resourceId } = extractResource(req.originalUrl);

    AuditLog.create({
      adminId: req.admin!.id,
      adminEmail: req.admin!.email,
      action: deriveAction(req.method, req.originalUrl),
      resource,
      resourceId,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || '',
      requestBody: sanitizeBody(req.body),
      responseStatus: res.statusCode,
      details: `Completed in ${Date.now() - startTime}ms`,
    }).catch((err) => {
      logger.error('Failed to create audit log:', err);
    });

    return originalJson(body);
  };

  next();
};
