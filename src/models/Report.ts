/**
 * Report model — user-submitted reports for moderation.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface IReport extends Document {
  reportedBy: Types.ObjectId;
  reportedUser: Types.ObjectId;
  callSessionId?: Types.ObjectId;
  reason: string;
  description: string;
  status: ReportStatus;
  resolvedBy?: Types.ObjectId;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    callSessionId: { type: Schema.Types.ObjectId, ref: 'CallSession' },
    reason: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'reviewing', 'resolved', 'dismissed'], default: 'pending' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    resolution: { type: String },
  },
  { timestamps: true },
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reportedUser: 1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
