/**
 * Wallet Service — manages user balance, deposits, deductions, and escrow.
 * All balance mutations are atomic using MongoDB's findOneAndUpdate.
 */
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Wallet, WalletTransaction, TransactionType, CallSession } from '../models';
import { ApiError } from '../utils/ApiError';
import { config } from '../config';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

/**
 * Get wallet balance for a user.
 */
export async function getBalance(userId: string) {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw ApiError.notFound('Wallet not found');
  return { balance: wallet.balance, currency: wallet.currency };
}

/**
 * Create a Razorpay order for wallet top-up.
 */
export async function createRazorpayOrder(userId: string, amount: number) {
  if (amount <= 0) throw ApiError.badRequest('Amount must be positive');
  if (amount < 10) throw ApiError.badRequest('Minimum deposit is ₹10');
  if (amount > 50000) throw ApiError.badRequest('Maximum deposit is ₹50,000');

  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw ApiError.notFound('Wallet not found');

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // Razorpay expects amount in paise
    currency: 'INR',
    receipt: `w_${userId.slice(-8)}_${Date.now()}`,
    notes: {
      userId,
      purpose: 'wallet_topup',
    },
  });

  return {
    orderId: order.id,
    amount: amount,
    currency: 'INR',
    keyId: config.razorpay.keyId,
  };
}

/**
 * Verify Razorpay payment and credit wallet.
 */
export async function verifyAndDeposit(
  userId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
) {
  // Verify signature
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw ApiError.badRequest('Payment verification failed — invalid signature');
  }

  // Fetch order details from Razorpay to get the amount
  const order = await razorpay.orders.fetch(razorpayOrderId);
  const amount = (order.amount as number) / 100; // Convert paise to rupees

  // Check for duplicate transaction
  const existing = await WalletTransaction.findOne({
    referenceId: razorpayPaymentId,
    referenceType: 'razorpay_payment',
  });
  if (existing) {
    throw ApiError.conflict('This payment has already been processed');
  }

  // Credit wallet atomically
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { balance: amount } },
    { new: true },
  );
  if (!wallet) throw ApiError.notFound('Wallet not found');

  // Log transaction
  await WalletTransaction.create({
    userId,
    type: 'deposit' as TransactionType,
    amount,
    balanceAfter: wallet.balance,
    description: `Wallet top-up via Razorpay`,
    referenceId: razorpayPaymentId,
    referenceType: 'razorpay_payment',
  });

  return { balance: wallet.balance };
}

/**
 * Deduct from user wallet during an active call (billing tick).
 * Returns updated balance or null if insufficient funds.
 */
export async function deductForCall(
  userId: string,
  amount: number,
  callSessionId: string,
): Promise<{ balance: number } | null> {
  // Atomic operation — only deducts if balance is sufficient
  const wallet = await Wallet.findOneAndUpdate(
    { userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true },
  );

  if (!wallet) return null; // Insufficient balance

  await WalletTransaction.create({
    userId,
    type: 'deduction' as TransactionType,
    amount: -amount,
    balanceAfter: wallet.balance,
    description: `Call charge`,
    referenceId: callSessionId,
    referenceType: 'call_session',
  });

  return { balance: wallet.balance };
}

/**
 * Add earnings to caller wallet.
 */
export async function addEarnings(
  callerId: string,
  amount: number,
  callSessionId: string,
) {
  const wallet = await Wallet.findOneAndUpdate(
    { userId: callerId },
    { $inc: { balance: amount } },
    { new: true },
  );
  if (!wallet) throw ApiError.notFound('Caller wallet not found');

  await WalletTransaction.create({
    userId: callerId,
    type: 'earning' as TransactionType,
    amount,
    balanceAfter: wallet.balance,
    description: `Call earnings`,
    referenceId: callSessionId,
    referenceType: 'call_session',
  });

  return { balance: wallet.balance };
}

/**
 * Get transaction history for a user with pagination.
 */
export async function getTransactions(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments({ userId }),
  ]);

  return {
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Check if user has sufficient balance for a call (minimum 2 minutes).
 */
export async function checkSufficientBalance(userId: string, pricePerMinute: number) {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw ApiError.notFound('Wallet not found');

  const minimumRequired = pricePerMinute * 2; // At least 2 minutes
  return {
    sufficient: wallet.balance >= minimumRequired,
    balance: wallet.balance,
    minimumRequired,
  };
}

/**
 * Get earnings breakdown: total, today, this week, this month.
 */
export async function getEarningsBreakdown(userId: string) {
  const now = new Date();

  // Start of today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Start of this week (Monday)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  // Start of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalResult, todayResult, weekResult, monthResult] = await Promise.all([
    WalletTransaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'earning' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    WalletTransaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'earning', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    WalletTransaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'earning', createdAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    WalletTransaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'earning', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    totalEarnings: totalResult[0]?.total || 0,
    todayEarnings: todayResult[0]?.total || 0,
    weekEarnings: weekResult[0]?.total || 0,
    monthEarnings: monthResult[0]?.total || 0,
  };
}

/**
 * Get enriched transaction history with call session details (user info, duration, call type).
 */
export async function getEnrichedTransactions(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments({ userId }),
  ]);

  // Enrich transactions that have a call_session reference
  const callSessionIds = transactions
    .filter((t) => t.referenceType === 'call_session' && t.referenceId)
    .map((t) => t.referenceId);

  const callSessions = callSessionIds.length > 0
    ? await CallSession.find({ _id: { $in: callSessionIds } })
        .populate('callerId', 'name avatar')
        .populate('customerId', 'name avatar')
        .lean()
    : [];

  const sessionMap = new Map(callSessions.map((s: any) => [s._id.toString(), s]));

  const enriched = transactions.map((t) => {
    const base: any = { ...t };
    if (t.referenceType === 'call_session' && t.referenceId) {
      const session = sessionMap.get(t.referenceId);
      if (session) {
        base.callSession = {
          _id: session._id,
          callType: session.callType,
          durationSeconds: session.durationSeconds,
          totalCost: session.totalCost,
          pricePerMinute: session.pricePerMinute,
          callerEarnings: session.callerEarnings,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          caller: session.callerId,
          customer: session.customerId,
        };
      }
    }
    return base;
  });

  return {
    transactions: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
