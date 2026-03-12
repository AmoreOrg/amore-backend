/**
 * Transaction Management Service — admin operations on transactions and refunds.
 */
import { WalletTransaction } from '../../models/WalletTransaction';
import { LedgerEntry } from '../../models/LedgerEntry';
import { Wallet } from '../../models/Wallet';
import { ApiError } from '../../utils/ApiError';

export async function listTransactions(query: {
  page?: number;
  limit?: number;
  type?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query.type) filter.type = query.type;
  if (query.userId) filter.userId = query.userId;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    WalletTransaction.countDocuments(filter),
  ]);

  return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getTransactionById(transactionId: string) {
  const transaction = await WalletTransaction.findById(transactionId)
    .populate('userId', 'name email phone');
  if (!transaction) throw ApiError.notFound('Transaction not found');
  return transaction;
}

export async function exportTransactions(query: {
  startDate?: string;
  endDate?: string;
  type?: string;
}) {
  const filter: Record<string, any> = {};
  if (query.type) filter.type = query.type;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  const transactions = await WalletTransaction.find(filter)
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(10000);

  // Return as JSON for the frontend to convert to CSV/Excel
  return { transactions, count: transactions.length };
}

export async function processRefund(transactionId: string, adminId: string, reason: string) {
  const transaction = await WalletTransaction.findById(transactionId);
  if (!transaction) throw ApiError.notFound('Transaction not found');

  if (transaction.type !== 'deduction' && transaction.type !== 'deposit') {
    throw ApiError.badRequest('Only deduction and deposit transactions can be refunded');
  }

  // Credit the user's wallet
  const wallet = await Wallet.findOneAndUpdate(
    { userId: transaction.userId },
    { $inc: { balance: transaction.amount } },
    { new: true },
  );
  if (!wallet) throw ApiError.notFound('User wallet not found');

  // Create refund transaction
  const refundTransaction = await WalletTransaction.create({
    userId: transaction.userId,
    type: 'refund',
    amount: transaction.amount,
    balanceAfter: wallet.balance,
    description: `Refund for transaction ${transactionId}: ${reason}`,
    referenceId: transactionId,
  });

  // Create ledger entry
  await LedgerEntry.create({
    userId: transaction.userId,
    type: 'refund',
    amountPaise: Math.round(transaction.amount * 100),
    balanceAfterPaise: Math.round(wallet.balance * 100),
    description: `Admin refund: ${reason}`,
    referenceId: transactionId,
    referenceType: 'refund',
  });

  return refundTransaction;
}
