/**
 * ChatMessage model — stores in-call chat messages between participants.
 */
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  callSessionId: Types.ObjectId;
  senderId: Types.ObjectId;
  message: string;
  isFlagged: boolean;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    callSessionId: { type: Schema.Types.ObjectId, ref: 'CallSession', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, maxlength: 1000 },
    isFlagged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ChatMessageSchema.index({ callSessionId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
