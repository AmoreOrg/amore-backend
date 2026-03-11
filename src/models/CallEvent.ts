/**
 * CallEvent model — granular event log for each call session.
 * Used for auditing and debugging call flows.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICallEvent extends Document {
  callSessionId: Types.ObjectId;
  event: string;
  data?: Record<string, any>;
  createdAt: Date;
}

const CallEventSchema = new Schema<ICallEvent>(
  {
    callSessionId: { type: Schema.Types.ObjectId, ref: 'CallSession', required: true },
    event: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

CallEventSchema.index({ callSessionId: 1, createdAt: 1 });

export const CallEvent = mongoose.model<ICallEvent>('CallEvent', CallEventSchema);
