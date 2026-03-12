/**
 * Payout Management Service — admin operations on payout requests.
 */
import { PayoutRequest } from '../../models/PayoutRequest';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { LedgerEntry } from '../../models/LedgerEntry';
import { ApiError } from '../../utils/ApiError';

export async function listPayouts(query: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;

  const [payouts, total] = await Promise.all([
    PayoutRequest.find(filter)
      .populate('callerId', 'name email phone')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    PayoutRequest.countDocuments(filter),
  ]);

  return { payouts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPayoutById(payoutId: string) {
  const payout = await PayoutRequest.findById(payoutId)
    .populate('callerId', 'name email phone');
  if (!payout) throw ApiError.notFound('Payout not found');
  return payout;
}

export async function approvePayout(payoutId: string, adminId: string) {
  const payout = await PayoutRequest.findById(payoutId);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status !== 'pending') throw ApiError.badRequest('Payout is not pending');

  payout.status = 'approved' as any;
  await payout.save();

  return payout;
}

export async function rejectPayout(payoutId: string, adminId: string, reason?: string) {
  const payout = await PayoutRequest.findById(payoutId);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status !== 'pending') throw ApiError.badRequest('Payout is not pending');

  // Refund the held amount back to caller's wallet
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
      description: `Payout rejected: ${reason || 'No reason provided'}`,
      referenceId: payoutId,
    });
  }

  payout.status = 'rejected' as any;
  await payout.save();

  return { payout, reason };
}

export async function releasePayout(payoutId: string, adminId: string) {
  const payout = await PayoutRequest.findById(payoutId);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status !== 'approved') throw ApiError.badRequest('Payout must be approved before release');

  payout.status = 'processed' as any;
  await payout.save();

  // Fetch the caller's current wallet balance for accurate ledger entry
  const wallet = await Wallet.findOne({ userId: payout.callerId });
  const currentBalancePaise = wallet ? Math.round(wallet.balance * 100) : 0;
  const amountPaise = Math.round(payout.amount * 100);

  // Create ledger entry for the release
  await LedgerEntry.create({
    userId: payout.callerId,
    type: 'withdrawal',
    amountPaise,
    balanceAfterPaise: currentBalancePaise - amountPaise,
    description: `Payout released: ${payoutId}`,
    referenceId: payoutId,
    referenceType: 'payout',
  });

  return payout;
}
