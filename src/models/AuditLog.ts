/**
 * AuditLog model — immutable log of all admin actions for compliance.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  adminId: Types.ObjectId;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  requestBody?: Record<string, any>;
  responseStatus: number;
  details?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    method: { type: String, required: true },
    path: { type: String, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, default: '' },
    requestBody: { type: Schema.Types.Mixed },
    responseStatus: { type: Number, required: true },
    details: { type: String },
  },
  { timestamps: true },
);

AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
