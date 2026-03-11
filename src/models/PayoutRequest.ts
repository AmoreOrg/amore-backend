/**
 * PayoutRequest model — caller withdrawal requests requiring admin approval.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'processed';

export interface IPayoutRequest extends Document {
  callerId: Types.ObjectId;
  amount: number;
  status: PayoutStatus;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
  adminNote?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutRequestSchema = new Schema<IPayoutRequest>(
  {
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processed'],
      default: 'pending',
    },
    bankDetails: {
      accountNumber: { type: String, required: true },
      ifscCode: { type: String, required: true },
      accountHolderName: { type: String, required: true },
    },
    adminNote: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

PayoutRequestSchema.index({ callerId: 1, createdAt: -1 });

export const PayoutRequest = mongoose.model<IPayoutRequest>('PayoutRequest', PayoutRequestSchema);
