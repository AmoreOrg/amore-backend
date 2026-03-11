/**
 * Payout Service — handles caller withdrawal requests and admin approval flow.
 */
import { PayoutRequest, Wallet, WalletTransaction } from '../models';
import { ApiError } from '../utils/ApiError';

/**
 * Caller requests a withdrawal.
 */
export async function requestPayout(callerId: string, data: {
  amount: number;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
}) {
  // Verify caller has sufficient balance
  const wallet = await Wallet.findOne({ userId: callerId });
  if (!wallet) throw ApiError.notFound('Wallet not found');
  if (wallet.balance < data.amount) {
    throw ApiError.badRequest(`Insufficient balance. Available: ₹${wallet.balance}`);
  }

  // Deduct balance immediately (hold)
  wallet.balance -= data.amount;
  await wallet.save();

  await WalletTransaction.create({
    userId: callerId,
    type: 'withdrawal',
    amount: -data.amount,
    balanceAfter: wallet.balance,
    description: 'Withdrawal request (held)',
    referenceType: 'payout_request',
  });

  const payout = await PayoutRequest.create({
    callerId,
    amount: data.amount,
    bankDetails: data.bankDetails,
    status: 'pending',
  });

  return payout;
}

/**
 * Admin approves or rejects a payout request.
 */
export async function processPayout(payoutId: string, action: 'approved' | 'rejected', adminNote?: string) {
  const payout = await PayoutRequest.findById(payoutId);
  if (!payout) throw ApiError.notFound('Payout request not found');
  if (payout.status !== 'pending') throw ApiError.badRequest('Payout already processed');

  if (action === 'rejected') {
    // Refund the held amount
    const wallet = await Wallet.findOneAndUpdate(
      { userId: payout.callerId },
      { $inc: { balance: payout.amount } },
      { new: true },
    );

    if (wallet) {
      await WalletTransaction.create({
        userId: payout.callerId,
        type: 'refund',
        amount: payout.amount,
        balanceAfter: wallet.balance,
        description: 'Payout request rejected — refund',
        referenceId: payoutId,
        referenceType: 'payout_request',
      });
    }
  }

  payout.status = action === 'approved' ? 'approved' : 'rejected';
  payout.adminNote = adminNote;
  payout.processedAt = new Date();
  await payout.save();

  return payout;
}

/**
 * Get payout history for a caller.
 */
export async function getPayoutHistory(callerId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [payouts, total] = await Promise.all([
    PayoutRequest.find({ callerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    PayoutRequest.countDocuments({ callerId }),
  ]);

  return {
    payouts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Admin: get all pending payout requests.
 */
export async function getPendingPayouts(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [payouts, total] = await Promise.all([
    PayoutRequest.find({ status: 'pending' })
      .populate('callerId', 'name email')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit),
    PayoutRequest.countDocuments({ status: 'pending' }),
  ]);

  return {
    payouts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
