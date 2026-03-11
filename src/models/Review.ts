/**
 * Review model — post-call ratings and feedback from users to callers.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  callSessionId: Types.ObjectId;
  callerId: Types.ObjectId;
  customerId: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    callSessionId: { type: Schema.Types.ObjectId, ref: 'CallSession', required: true, unique: true },
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true },
);

ReviewSchema.index({ callerId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
