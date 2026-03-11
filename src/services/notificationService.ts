/**
 * Notification Service — sends push notifications via Firebase Cloud Messaging
 * and persists notification records in MongoDB.
 */
import * as admin from 'firebase-admin';
import { Notification, User } from '../models';
import { config } from '../config';
import logger from '../utils/logger';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const { projectId, clientEmail, privateKey } = config.firebase;
  const hasCredentials = projectId && clientEmail && privateKey;
  const isValidPem = privateKey.includes('-----BEGIN');

  if (hasCredentials && isValidPem) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      logger.info('Firebase Admin SDK initialized');
    } catch (err: any) {
      logger.error(`Firebase Admin SDK initialization failed: ${err.message}`);
      logger.warn('Push notifications will be logged only (FCM disabled)');
    }
  } else if (hasCredentials && !isValidPem) {
    logger.error(
      'FIREBASE_PRIVATE_KEY is not a valid PEM key. ' +
      'It must be the private key from a Firebase service account JSON file ' +
      '(starts with "-----BEGIN PRIVATE KEY-----"). ' +
      'Download one from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key',
    );
    logger.warn('Push notifications will be logged only (FCM disabled)');
  } else {
    logger.warn('Firebase credentials not configured — push notifications will be logged only');
  }
}

/**
 * Send a push notification to a specific user.
 */
export async function sendPushNotification(userId: string, payload: {
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}) {
  // 1. Persist notification in DB
  await Notification.create({
    userId,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    data: payload.data,
  });

  // 2. Get user's FCM token
  const user = await User.findById(userId);
  if (!user?.fcmToken) {
    logger.warn(`No FCM token for user ${userId} — push skipped`);
    return;
  }

  // 3. Send via Firebase Cloud Messaging
  try {
    if (admin.apps.length > 0) {
      await admin.messaging().send({
        token: user.fcmToken,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ? Object.fromEntries(
          Object.entries(payload.data).map(([k, v]) => [k, String(v)])
        ) : undefined,
        android: {
          priority: 'high',
          notification: {
            channelId: payload.type === 'incoming_call' ? 'calls' : 'general',
            priority: 'high',
            sound: payload.type === 'incoming_call' ? 'ringtone' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: payload.type === 'incoming_call' ? 'ringtone.caf' : 'default',
              badge: 1,
              ...(payload.type === 'incoming_call' && { 'content-available': 1 }),
            },
          },
        },
      });
      logger.info(`Push notification sent to ${userId}: ${payload.title}`);
    } else {
      logger.info(`[FCM-MOCK] Push notification for ${userId}: ${payload.title} — ${payload.body}`);
    }
  } catch (err: any) {
    // Handle invalid/expired FCM token
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      logger.warn(`Invalid FCM token for user ${userId} — clearing token`);
      await User.findByIdAndUpdate(userId, { $unset: { fcmToken: 1 } });
    } else {
      logger.error(`Failed to send push to ${userId}:`, err);
    }
  }
}

/**
 * Send incoming call push notification.
 */
export async function notifyIncomingCall(callerId: string, data: {
  callId: string;
  customerName: string;
  callType: string;
}) {
  await sendPushNotification(callerId, {
    title: 'Incoming Call',
    body: `${data.customerName} is calling you (${data.callType})`,
    type: 'incoming_call',
    data: { callId: data.callId, callType: data.callType },
  });
}

/**
 * Send wallet deposit confirmation.
 */
export async function notifyWalletDeposit(userId: string, amount: number) {
  await sendPushNotification(userId, {
    title: 'Wallet Credited',
    body: `₹${amount} has been added to your wallet`,
    type: 'wallet_deposit',
    data: { amount: amount.toString() },
  });
}

/**
 * Send low balance warning.
 */
export async function notifyLowBalance(userId: string, balance: number) {
  await sendPushNotification(userId, {
    title: 'Low Balance',
    body: `Your wallet balance is ₹${balance}. Top up to continue making calls.`,
    type: 'low_balance',
    data: { balance: balance.toString() },
  });
}

/**
 * Get user notifications with pagination.
 */
export async function getUserNotifications(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({ userId }),
  ]);

  return {
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string, userId: string) {
  await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
  );
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
}
