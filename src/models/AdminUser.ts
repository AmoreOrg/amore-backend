/**
 * AdminUser model — admin portal user entity, separate from mobile app User.
 * Linked to a Role for RBAC permissions.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAdminUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Types.ObjectId;
  isActive: boolean;
  lastLoginAt?: Date;
  refreshToken?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    refreshToken: { type: String, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

AdminUserSchema.index({ email: 1 });

export const AdminUser = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
