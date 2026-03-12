/**
 * User Management Service — admin operations on platform users.
 */
import { User } from '../../models/User';
import { Wallet } from '../../models/Wallet';
import { CallSession } from '../../models/CallSession';
import { WalletTransaction } from '../../models/WalletTransaction';
import { Review } from '../../models/Review';
import { Notification } from '../../models/Notification';
import { ApiError } from '../../utils/ApiError';

export async function listUsers(query: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isBlocked?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query.role) filter.role = query.role;
  if (query.isBlocked === 'true') filter.isBlocked = true;
  if (query.isBlocked === 'false') filter.isBlocked = false;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserById(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function banUser(userId: string) {
  const user = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function unbanUser(userId: string) {
  const user = await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function deleteUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  // Clean up related data
  await Promise.all([
    Wallet.deleteOne({ userId }),
    Notification.deleteMany({ userId }),
  ]);

  await User.findByIdAndDelete(userId);
  return { message: 'User deleted successfully' };
}

export async function getUserActivity(userId: string, query: { page?: number; limit?: number }) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const [calls, transactions, reviews, wallet] = await Promise.all([
    CallSession.find({ $or: [{ customerId: userId }, { callerId: userId }] })
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(50),
    Review.find({ $or: [{ customerId: userId }, { callerId: userId }] }).sort({ createdAt: -1 }).limit(20),
    Wallet.findOne({ userId }),
  ]);

  return { user, wallet, calls, transactions, reviews };
}
