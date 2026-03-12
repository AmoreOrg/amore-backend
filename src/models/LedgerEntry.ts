/**
 * LedgerEntry — immutable, append-only financial ledger.
 *
 * Every monetary movement (deduction, earning, commission, deposit, withdrawal)
 * creates exactly one entry here.  Entries are NEVER updated or deleted.
 *
 * Immutability enforced via:
 *   1. Mongoose middleware blocks save-on-existing, updateOne, updateMany,
 *      findOneAndUpdate, deleteOne, deleteMany, findOneAndDelete.
 *   2. No update/delete helpers are exported from the service layer.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export type LedgerType =
  | 'call_deduction'     // customer charged for a billing tick
  | 'call_earning'       // caller credited for a billing tick
  | 'platform_commission'// platform cut for a billing tick
  | 'deposit'            // wallet top-up
  | 'withdrawal'         // payout to bank
  | 'refund';            // refund to customer

export interface ILedgerEntry extends Document {
  /** The user whose wallet is affected */
  userId: Types.ObjectId;
  /** Counter-party (other side of the transaction, if applicable) */
  counterpartyId?: Types.ObjectId;
  type: LedgerType;
  /** Always positive. Direction is implied by type. */
  amountPaise: number;
  /** Balance (in paise) of the user's wallet AFTER this entry */
  balanceAfterPaise: number;
  /** e.g. callSessionId, razorpay paymentId */
  referenceId: string;
  referenceType: string;
  description: string;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'call_deduction',
        'call_earning',
        'platform_commission',
        'deposit',
        'withdrawal',
        'refund',
      ],
      required: true,
    },
    amountPaise: { type: Number, required: true, min: 0 },
    balanceAfterPaise: { type: Number, required: true },
    referenceId: { type: String, required: true },
    referenceType: { type: String, required: true },
    description: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // no updatedAt — entries are immutable
  },
);

// ─── Immutability guards ─────────────────────────────────────────────────────
// Block any update operations
const blockUpdate = function (this: any, next: Function) {
  next(new Error('LedgerEntry is immutable — updates are not allowed'));
};
LedgerEntrySchema.pre('updateOne', blockUpdate);
LedgerEntrySchema.pre('updateMany', blockUpdate);
LedgerEntrySchema.pre('findOneAndUpdate', blockUpdate);
LedgerEntrySchema.pre('findOneAndReplace', blockUpdate);

// Block any delete operations
const blockDelete = function (this: any, next: Function) {
  next(new Error('LedgerEntry is immutable — deletions are not allowed'));
};
LedgerEntrySchema.pre('deleteOne', blockDelete);
LedgerEntrySchema.pre('deleteMany', blockDelete);
LedgerEntrySchema.pre('findOneAndDelete', blockDelete);

// Block save on an existing (non-new) document (prevents modifying after insert)
LedgerEntrySchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('LedgerEntry is immutable — cannot modify an existing entry'));
  }
  next();
});

// Indexes
LedgerEntrySchema.index({ userId: 1, createdAt: -1 });
LedgerEntrySchema.index({ referenceId: 1, referenceType: 1 });
LedgerEntrySchema.index({ type: 1, createdAt: -1 });

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
