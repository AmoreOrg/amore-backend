/**
 * Chat Management Service — admin operations on chat messages.
 */
import { ChatMessage } from '../../models/ChatMessage';
import { ApiError } from '../../utils/ApiError';

export async function getChatMessages(query: {
  page?: number;
  limit?: number;
  callSessionId?: string;
  userId?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 200);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query.callSessionId) filter.callSessionId = query.callSessionId;
  if (query.userId) filter.senderId = query.userId;

  const [messages, total] = await Promise.all([
    ChatMessage.find(filter)
      .populate('senderId', 'name email avatar')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChatMessage.countDocuments(filter),
  ]);

  return { messages, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getFlaggedMessages(query: { page?: number; limit?: number }) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 200);
  const skip = (page - 1) * limit;

  const filter = { isFlagged: true };

  const [messages, total] = await Promise.all([
    ChatMessage.find(filter)
      .populate('senderId', 'name email avatar')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChatMessage.countDocuments(filter),
  ]);

  return { messages, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function deleteMessage(messageId: string) {
  const message = await ChatMessage.findByIdAndDelete(messageId);
  if (!message) throw ApiError.notFound('Message not found');
  return { message: 'Message deleted successfully' };
}
