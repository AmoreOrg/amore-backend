/**
 * System Service — system configuration and audit log management.
 */
import { SystemConfig } from '../../models/SystemConfig';
import { AuditLog } from '../../models/AuditLog';
import { ApiError } from '../../utils/ApiError';

// ─── System Configuration ────────────────────────────────────────────

export async function listConfigs() {
  return SystemConfig.find().sort({ key: 1 });
}

export async function getConfig(key: string) {
  const config = await SystemConfig.findOne({ key });
  if (!config) throw ApiError.notFound('Config not found');
  return config;
}

export async function updateConfig(key: string, value: any, adminId: string) {
  const config = await SystemConfig.findOneAndUpdate(
    { key },
    { $set: { value, updatedBy: adminId } },
    { new: true, upsert: true },
  );
  return config;
}

// ─── Audit Logs ──────────────────────────────────────────────────────

export async function listAuditLogs(query: {
  page?: number;
  limit?: number;
  adminId?: string;
  resource?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 200);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query.adminId) filter.adminId = query.adminId;
  if (query.resource) filter.resource = query.resource;
  if (query.action) filter.action = { $regex: query.action, $options: 'i' };
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}
