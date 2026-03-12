/**
 * Permission model — atomic permission entries for RBAC.
 * Each permission represents a single granular action.
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  code: string;
  name: string;
  group: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    group: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true },
);

PermissionSchema.index({ group: 1 });

export const Permission = mongoose.model<IPermission>('Permission', PermissionSchema);
