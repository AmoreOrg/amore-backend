/**
 * WebSocket Server — handles realtime communication for calls, billing, and presence.
 *
 * Events emitted/received:
 *   incoming_call      — notify caller of new call request
 *   call_accept        — caller accepts the call
 *   call_reject        — caller rejects the call
 *   call_start         — both parties join Agora channel
 *   call_end           — call is terminated
 *   billing_tick       — periodic billing update during call
 *   balance_update     — user wallet balance changed
 *   insufficient_balance — call ended due to low balance
 *   caller_online      — caller goes online
 *   caller_offline     — caller goes offline
 *
 * Socket authentication is done via JWT in the handshake auth object.
 */
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthPayload } from '../middlewares/auth';
import { CallSession } from '../models';
import { ChatMessage } from '../models/ChatMessage';
import * as callService from '../services/callService';
import logger from '../utils/logger';

let io: Server;

// Track online users: userId → socketId
const onlineUsers = new Map<string, string>();

/**
 * Initialize the WebSocket server and attach it to the HTTP server.
 */
export function initWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Authentication middleware ────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as AuthPayload;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection handler ──────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user: AuthPayload = (socket as any).user;
    const userId = user.userId;

    // Register user as online
    onlineUsers.set(userId, socket.id);
    logger.info(`WS connected: ${userId} (${socket.id})`);

    // Join personal room for targeted events
    socket.join(`user:${userId}`);

    // ─── Caller presence events ─────────────────────────────────────
    socket.on('caller_online', () => {
      logger.info(`Caller online: ${userId}`);
      io.emit('caller_online', { callerId: userId });
    });

    socket.on('caller_offline', () => {
      logger.info(`Caller offline: ${userId}`);
      io.emit('caller_offline', { callerId: userId });
    });

    // ─── Call signaling events ──────────────────────────────────────
    socket.on('call_accept', async (data: { callId: string; customerId?: string }) => {
      logger.info(`Call accepted via WS: ${data.callId}`);
      // Resolve the customer from data or by looking up the session
      let customerId = data.customerId;
      if (!customerId) {
        try {
          const session = await CallSession.findById(data.callId).lean();
          customerId = session?.customerId?.toString();
        } catch (err: any) {
          logger.error(`Failed to look up session for call_accept: ${err.message}`);
        }
      }
      if (customerId) {
        io.to(`user:${customerId}`).emit('call_accept', { callId: data.callId });
      }
    });

    socket.on('call_reject', (data: { callId: string; customerId: string }) => {
      logger.info(`Call rejected via WS: ${data.callId}`);
      io.to(`user:${data.customerId}`).emit('call_reject', data);
    });

    socket.on('call_end', async (data: { callId: string; targetUserId: string }) => {
      logger.info(`Call end via WS: ${data.callId}`);
      try {
        await callService.endCall(data.callId, userId, 'user_ended');
      } catch (err: any) {
        logger.error(`Failed to end call ${data.callId} via WS: ${err.message}`);
      }
      io.to(`user:${data.targetUserId}`).emit('call_end', data);
    });

    // ─── In-call chat ──────────────────────────────────────────────────
    socket.on('chat_message', async (data: { callId: string; message: string }, ack?: (res: any) => void) => {
      const msg = (data.message || '').trim();
      if (!msg || msg.length > 1000) {
        if (ack) ack({ success: false, error: 'Invalid message' });
        return;
      }

      try {
        // Verify the sender is a participant of the call
        const session = await CallSession.findById(data.callId).lean();
        if (!session) {
          if (ack) ack({ success: false, error: 'Call not found' });
          return;
        }

        const callerId = session.callerId.toString();
        const customerId = session.customerId.toString();
        if (userId !== callerId && userId !== customerId) {
          if (ack) ack({ success: false, error: 'Not a participant' });
          return;
        }

        // Persist the message
        const chatMsg = await ChatMessage.create({
          callSessionId: data.callId,
          senderId: userId,
          message: msg,
        });

        const payload = {
          _id: chatMsg._id.toString(),
          callId: data.callId,
          senderId: userId,
          message: msg,
          createdAt: chatMsg.createdAt.toISOString(),
        };

        // Deliver to the other participant
        const recipientId = userId === callerId ? customerId : callerId;
        io.to(`user:${recipientId}`).emit('chat_message', payload);

        if (ack) ack({ success: true, data: payload });
      } catch (err: any) {
        logger.error(`chat_message error: ${err.message}`);
        if (ack) ack({ success: false, error: 'Failed to send message' });
      }
    });

    socket.on('chat_history', async (data: { callId: string }, ack?: (res: any) => void) => {
      try {
        const session = await CallSession.findById(data.callId).lean();
        if (!session) {
          if (ack) ack({ success: false, error: 'Call not found' });
          return;
        }

        const callerId = session.callerId.toString();
        const customerId = session.customerId.toString();
        if (userId !== callerId && userId !== customerId) {
          if (ack) ack({ success: false, error: 'Not a participant' });
          return;
        }

        const messages = await ChatMessage.find({ callSessionId: data.callId })
          .sort({ createdAt: 1 })
          .limit(200)
          .lean();

        if (ack) ack({ success: true, data: messages });
      } catch (err: any) {
        logger.error(`chat_history error: ${err.message}`);
        if (ack) ack({ success: false, error: 'Failed to fetch history' });
      }
    });

    // ─── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      logger.info(`WS disconnected: ${userId}`);

      // End any active calls this user is in
      try {
        const activeCalls = await CallSession.find({
          $or: [{ callerId: userId }, { customerId: userId }],
          status: { $in: ['active', 'ringing'] },
        });
        for (const session of activeCalls) {
          try {
            await callService.endCall(session._id.toString(), userId, 'disconnect');
            const otherUserId =
              session.callerId.toString() === userId
                ? session.customerId.toString()
                : session.callerId.toString();
            io.to(`user:${otherUserId}`).emit('call_end', {
              callId: session._id.toString(),
              reason: 'disconnect',
            });
            logger.info(`Ended active call ${session._id} on disconnect of ${userId}`);
          } catch (err: any) {
            logger.error(`Failed to end call ${session._id} on disconnect: ${err.message}`);
          }
        }
      } catch (err: any) {
        logger.error(`Error cleaning up calls on disconnect for ${userId}: ${err.message}`);
      }

      // If caller, broadcast offline status
      if (user.role === 'caller') {
        io.emit('caller_offline', { callerId: userId });
      }
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

/**
 * Get the Socket.io server instance.
 */
export function getIO(): Server | undefined {
  return io;
}

/**
 * Send an event to a specific user by their userId.
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (!io) {
    logger.warn(`WebSocket not initialized — cannot emit '${event}' to user ${userId}`);
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Send an incoming call notification to a caller.
 */
export function notifyIncomingCall(callerId: string, data: {
  callId: string;
  customerId: string;
  customerName: string;
  callType: string;
  pricePerMinute: number;
  callerRtcToken: string;
  channelName: string;
}): void {
  emitToUser(callerId, 'incoming_call', data);
  logger.info(`Incoming call notification sent to caller: ${callerId}`);
}

/**
 * Send billing tick update to both parties during active call.
 */
export function emitBillingTick(customerId: string, callerId: string, data: {
  callId: string;
  durationSeconds: number;
  totalCost: number;
  customerBalance: number;
  callerEarnings: number;
}): void {
  emitToUser(customerId, 'billing_tick', data);
  emitToUser(callerId, 'billing_tick', data);
}

/**
 * Send balance update to a user.
 */
export function emitBalanceUpdate(userId: string, balance: number): void {
  emitToUser(userId, 'balance_update', { balance });
}

/**
 * Notify user that call ended due to insufficient balance.
 */
export function emitInsufficientBalance(customerId: string, callerId: string, callId: string): void {
  const data = { callId, reason: 'insufficient_balance' };
  emitToUser(customerId, 'insufficient_balance', data);
  emitToUser(callerId, 'call_end', data);
}

/**
 * Check if a user is currently connected via WebSocket.
 */
export function isUserOnline(userId: string): boolean {
  if (!io) return false;
  return onlineUsers.has(userId);
}
