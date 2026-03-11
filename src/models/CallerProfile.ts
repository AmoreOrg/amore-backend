/**
 * CallerProfile model — extended profile for users who offer paid calls.
 * Contains pricing, expertise, availability, and search metadata.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICallerProfile extends Document {
  userId: Types.ObjectId;
  bio: string;
  languages: string[];
  expertise: string[];
  experience: string;
  pricePerMinute: number;
  isOnline: boolean;
  rating: number;
  totalCalls: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

const CallerProfileSchema = new Schema<ICallerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, default: '' },
    languages: [{ type: String }],
    expertise: [{ type: String }],
    experience: { type: String, default: '' },
    pricePerMinute: { type: Number, required: true, min: 1 },
    isOnline: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalCalls: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Text index for search
CallerProfileSchema.index({ expertise: 1 });
CallerProfileSchema.index({ languages: 1 });
CallerProfileSchema.index({ isOnline: 1, pricePerMinute: 1 });

export const CallerProfile = mongoose.model<ICallerProfile>('CallerProfile', CallerProfileSchema);
