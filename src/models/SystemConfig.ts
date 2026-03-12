/**
 * SystemConfig model — key-value store for platform configuration.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISystemConfig extends Document {
  key: string;
  value: Schema.Types.Mixed;
  description: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
