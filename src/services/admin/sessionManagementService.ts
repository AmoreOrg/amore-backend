/**
 * Session Management Service — admin operations on call sessions.
 */
import { CallSession } from '../../models/CallSession';
import { CallEvent } from '../../models/CallEvent';
import { ApiError } from '../../utils/ApiError';

export async function listSessions(query: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.userId) {
    filter.$or = [{ customerId: query.userId }, { callerId: query.userId }];
  }

  const [sessions, total] = await Promise.all([
    CallSession.find(filter)
      .populate('customerId', 'name email avatar')
      .populate('callerId', 'name email avatar')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    CallSession.countDocuments(filter),
  ]);

  return { sessions, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getSessionById(sessionId: string) {
  const session = await CallSession.findById(sessionId)
    .populate('customerId', 'name email avatar phone')
    .populate('callerId', 'name email avatar phone');
  if (!session) throw ApiError.notFound('Session not found');

  const events = await CallEvent.find({ callSessionId: sessionId }).sort({ createdAt: 1 });

  return { session, events };
}

export async function forceEndSession(sessionId: string, adminId: string) {
  const session = await CallSession.findById(sessionId);
  if (!session) throw ApiError.notFound('Session not found');

  if (!['initiated', 'ringing', 'accepted', 'active'].includes(session.status)) {
    throw ApiError.badRequest('Session is not in an active state');
  }

  session.status = 'completed' as any;
  session.endTime = new Date();
  if (session.startTime) {
    session.durationSeconds = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000);
  }
  await session.save();

  // Log the force-end event
  await CallEvent.create({
    callSessionId: sessionId,
    event: 'force_ended_by_admin',
    data: { adminId, endedAt: session.endTime },
  });

  return session;
}
