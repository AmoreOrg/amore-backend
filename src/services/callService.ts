/**
 * Call Service — manages the full lifecycle of audio/video call sessions.
 *
 * Flow:
 * 1. Customer initiates call → balance check → create session → notify caller
 * 2. Caller accepts → generate Agora tokens → both join channel
 * 3. Billing worker charges every 10 seconds
 * 4. Call ends → finalize session → record earnings
 */
import { v4 as uuidv4 } from 'uuid';
import { CallSession, CallEvent, CallerProfile } from '../models';
import * as walletService from './walletService';
import { generateRtcToken } from '../utils/agoraToken';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import logger from '../utils/logger';

/**
 * Initiate a new call from customer to caller.
 * Validates balance, creates session, returns Agora credentials.
 */
export async function initiateCall(customerId: string, callerProfileId: string, callType: 'audio' | 'video' = 'audio') {
  // 1. Fetch caller profile & validate
  const callerProfile = await CallerProfile.findById(callerProfileId);
  if (!callerProfile) throw ApiError.notFound('Caller not found');
  if (!callerProfile.isOnline) throw ApiError.badRequest('Caller is offline');

  // 2. Check customer wallet balance (must cover at least 2 min)
  const balanceCheck = await walletService.checkSufficientBalance(customerId, callerProfile.pricePerMinute);
  if (!balanceCheck.sufficient) {
    throw ApiError.badRequest(
      `Insufficient balance. Minimum required: ₹${balanceCheck.minimumRequired}, Available: ₹${balanceCheck.balance}`,
    );
  }

  // 3. Generate unique channel name
  const channelName = `amore_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

  // 4. Generate Agora tokens for both participants
  const customerToken = generateRtcToken(1, channelName); // uid=1 for customer
  const callerToken = generateRtcToken(2, channelName);   // uid=2 for caller

  // 5. Create call session
  const session = await CallSession.create({
    callerId: callerProfile.userId,
    customerId,
    callType,
    pricePerMinute: callerProfile.pricePerMinute,
    status: 'ringing',
    channelName,
  });

  // 6. Log event
  await CallEvent.create({
    callSessionId: session._id,
    event: 'call_initiated',
    data: { customerId, callerId: callerProfile.userId.toString(), callType },
  });

  logger.info(`Call initiated: ${session._id} | Customer: ${customerId} → Caller: ${callerProfile.userId}`);

  return {
    callId: session._id,
    channelName,
    customerRtcToken: customerToken.rtcToken,
    callerRtcToken: callerToken.rtcToken,
    pricePerMinute: callerProfile.pricePerMinute,
    callType,
    callerId: callerProfile.userId.toString(),
  };
}

/**
 * Caller accepts the incoming call — transitions session to 'accepted'.
 */
export async function acceptCall(callId: string, callerId: string) {
  const session = await CallSession.findById(callId);
  if (!session) throw ApiError.notFound('Call session not found');
  if (session.callerId.toString() !== callerId) throw ApiError.forbidden('Not your call');
  if (session.status !== 'ringing') throw ApiError.badRequest('Call is not in ringing state');

  session.status = 'active';
  session.startTime = new Date();
  await session.save();

  await CallEvent.create({
    callSessionId: session._id,
    event: 'call_accepted',
    data: { callerId },
  });

  logger.info(`Call accepted: ${callId}`);
  return session;
}

/**
 * Caller rejects the incoming call.
 */
export async function rejectCall(callId: string, callerId: string) {
  const session = await CallSession.findById(callId);
  if (!session) throw ApiError.notFound('Call session not found');
  if (session.callerId.toString() !== callerId) throw ApiError.forbidden('Not your call');
  if (session.status !== 'ringing') throw ApiError.badRequest('Call is not in ringing state');

  session.status = 'rejected';
  session.endTime = new Date();
  await session.save();

  await CallEvent.create({
    callSessionId: session._id,
    event: 'call_rejected',
    data: { callerId },
  });

  return session;
}

/**
 * End an active call — calculates final duration and earnings.
 */
export async function endCall(callId: string, userId: string, reason = 'user_ended') {
  const session = await CallSession.findById(callId);
  if (!session) throw ApiError.notFound('Call session not found');

  // Either party can end the call
  const isParticipant =
    session.callerId.toString() === userId || session.customerId.toString() === userId;
  if (!isParticipant) throw ApiError.forbidden('Not a participant in this call');

  if (session.status !== 'active') throw ApiError.badRequest('Call is not active');

  const endTime = new Date();
  const durationMs = endTime.getTime() - (session.startTime?.getTime() || endTime.getTime());
  const durationSeconds = Math.floor(durationMs / 1000);

  session.status = 'completed';
  session.endTime = endTime;
  session.durationSeconds = durationSeconds;
  session.endReason = reason;
  await session.save();

  // Update caller profile stats
  await CallerProfile.findOneAndUpdate(
    { userId: session.callerId },
    {
      $inc: {
        totalCalls: 1,
        totalEarnings: session.callerEarnings,
      },
    },
  );

  await CallEvent.create({
    callSessionId: session._id,
    event: 'call_ended',
    data: { userId, reason, durationSeconds },
  });

  logger.info(`Call ended: ${callId} | Duration: ${durationSeconds}s | Cost: ₹${session.totalCost}`);
  return session;
}

/**
 * Get call history for a user (both as customer and caller).
 */
export async function getCallHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [calls, total] = await Promise.all([
    CallSession.find({
      $or: [{ callerId: userId }, { customerId: userId }],
    })
      .populate('callerId', 'name avatar')
      .populate('customerId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CallSession.countDocuments({
      $or: [{ callerId: userId }, { customerId: userId }],
    }),
  ]);

  return {
    calls,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Get a single call session by ID.
 */
export async function getCallSession(callId: string) {
  const session = await CallSession.findById(callId)
    .populate('callerId', 'name avatar')
    .populate('customerId', 'name avatar');
  if (!session) throw ApiError.notFound('Call session not found');
  return session;
}

/**
 * Get recent contacts for an expert (callers who called them).
 * Returns unique users with their most recent call info.
 */
export async function getRecentContacts(callerId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  // Aggregate to get unique customers with their most recent call
  const contacts = await CallSession.aggregate([
    {
      $match: {
        callerId: new (require('mongoose').Types.ObjectId)(callerId),
        status: { $in: ['completed', 'active'] },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$customerId',
        lastCallId: { $first: '$_id' },
        lastCallType: { $first: '$callType' },
        lastCallDate: { $first: '$createdAt' },
        lastDuration: { $first: '$durationSeconds' },
        lastCost: { $first: '$totalCost' },
        lastStatus: { $first: '$status' },
        totalCalls: { $sum: 1 },
        totalDuration: { $sum: '$durationSeconds' },
        totalSpent: { $sum: '$totalCost' },
      },
    },
    { $sort: { lastCallDate: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },
    {
      $project: {
        customerId: '$_id',
        customerName: '$customer.name',
        customerAvatar: '$customer.avatar',
        lastCallId: 1,
        lastCallType: 1,
        lastCallDate: 1,
        lastDuration: 1,
        lastCost: 1,
        lastStatus: 1,
        totalCalls: 1,
        totalDuration: 1,
        totalSpent: 1,
      },
    },
  ]);

  const total = await CallSession.aggregate([
    {
      $match: {
        callerId: new (require('mongoose').Types.ObjectId)(callerId),
        status: { $in: ['completed', 'active'] },
      },
    },
    { $group: { _id: '$customerId' } },
    { $count: 'total' },
  ]);

  return {
    contacts,
    pagination: {
      page,
      limit,
      total: total[0]?.total || 0,
      pages: Math.ceil((total[0]?.total || 0) / limit),
    },
  };
}
