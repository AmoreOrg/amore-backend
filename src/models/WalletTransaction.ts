/**
 * WalletTransaction model — immutable ledger of all wallet movements.
 * Types: deposit, deduction, escrow_lock, escrow_release, earning, withdrawal.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export type TransactionType =
  | 'deposit'
  | 'deduction'
  | 'escrow_lock'
  | 'escrow_release'
  | 'earning'
  | 'withdrawal'
  | 'refund';

export interface IWalletTransaction extends Document {
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;          // callSessionId, razorpay orderId, etc.
  referenceType?: string;
  createdAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['deposit', 'deduction', 'escrow_lock', 'escrow_release', 'earning', 'withdrawal', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    referenceId: { type: String },
    referenceType: { type: String },
  },
  { timestamps: true },
);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransaction = mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);
