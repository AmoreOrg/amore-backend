/**
 * CallSession model — tracks the lifecycle of each call from initiation to completion.
 * Contains billing details, Agora channel info, and cost breakdown.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export type CallStatus =
  | 'initiated'
  | 'ringing'
  | 'accepted'
  | 'active'
  | 'completed'
  | 'rejected'
  | 'missed'
  | 'failed'
  | 'cancelled';

export type CallType = 'audio' | 'video';

export interface ICallSession extends Document {
  callerId: Types.ObjectId;      // the expert/caller
  customerId: Types.ObjectId;    // the user paying
  callType: CallType;
  pricePerMinute: number;
  status: CallStatus;
  channelName: string;
  agoraToken?: string;
  startTime?: Date;
  endTime?: Date;
  durationSeconds: number;
  totalCost: number;
  platformCommission: number;
  callerEarnings: number;
  endReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CallSessionSchema = new Schema<ICallSession>(
  {
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    callType: { type: String, enum: ['audio', 'video'], default: 'audio' },
    pricePerMinute: { type: Number, required: true },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'accepted', 'active', 'completed', 'rejected', 'missed', 'failed', 'cancelled'],
      default: 'initiated',
    },
    channelName: { type: String, required: true, unique: true },
    agoraToken: { type: String },
    startTime: { type: Date },
    endTime: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    callerEarnings: { type: Number, default: 0 },
    endReason: { type: String },
  },
  { timestamps: true },
);

CallSessionSchema.index({ callerId: 1, createdAt: -1 });
CallSessionSchema.index({ customerId: 1, createdAt: -1 });
CallSessionSchema.index({ status: 1 });

export const CallSession = mongoose.model<ICallSession>('CallSession', CallSessionSchema);
