/**
 * Role model — named collection of permissions for RBAC.
 * Roles are assigned to admin users via AdminUser.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRole extends Document {
  name: string;
  slug: string;
  description: string;
  permissions: Types.ObjectId[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Role = mongoose.model<IRole>('Role', RoleSchema);
