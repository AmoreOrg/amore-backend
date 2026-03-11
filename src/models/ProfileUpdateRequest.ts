/**
 * ProfileUpdateRequest model — stores pending profile update requests from experts.
 * Updates only apply after admin approval.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export type ProfileUpdateStatus = 'pending' | 'approved' | 'rejected';

export interface IProfileUpdateRequest extends Document {
  userId: Types.ObjectId;
  requestedChanges: {
    bio?: string;
    languages?: string[];
    expertise?: string[];
    experience?: string;
    pricePerMinute?: number;
  };
  status: ProfileUpdateStatus;
  adminNote?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileUpdateRequestSchema = new Schema<IProfileUpdateRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedChanges: {
      bio: { type: String },
      languages: [{ type: String }],
      expertise: [{ type: String }],
      experience: { type: String },
      pricePerMinute: { type: Number },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

ProfileUpdateRequestSchema.index({ userId: 1, status: 1 });
ProfileUpdateRequestSchema.index({ status: 1, createdAt: -1 });

export const ProfileUpdateRequest = mongoose.model<IProfileUpdateRequest>(
  'ProfileUpdateRequest',
  ProfileUpdateRequestSchema,
);
