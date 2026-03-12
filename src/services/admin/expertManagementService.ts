/**
 * Expert Management Service — admin operations on experts (callers).
 */
import { User } from '../../models/User';
import { CallerProfile } from '../../models/CallerProfile';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { LedgerEntry } from '../../models/LedgerEntry';
import { CallSession } from '../../models/CallSession';
import { ProfileUpdateRequest } from '../../models/ProfileUpdateRequest';
import { Notification } from '../../models/Notification';
import { ApiError } from '../../utils/ApiError';

export async function listExperts(query: {
  page?: number;
  limit?: number;
  search?: string;
  isOnline?: string;
  isBlocked?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const userFilter: Record<string, any> = { role: 'caller' };
  if (query.isBlocked === 'true') userFilter.isBlocked = true;
  if (query.isBlocked === 'false') userFilter.isBlocked = false;
  if (query.search) {
    userFilter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(userFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(userFilter),
  ]);

  const userIds = users.map((u) => u._id);
  const profiles = await CallerProfile.find({ userId: { $in: userIds } });
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

  const experts = users.map((u) => ({
    user: u,
    profile: profileMap.get(u._id.toString()) || null,
  }));

  return { experts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getExpertById(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Expert not found');
  const profile = await CallerProfile.findOne({ userId });
  return { user, profile };
}

export async function approveExpert(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  user.role = 'caller';
  user.isActive = true;
  user.isBlocked = false;
  await user.save();

  // Create wallet if doesn't exist
  const existingWallet = await Wallet.findOne({ userId });
  if (!existingWallet) {
    await Wallet.create({ userId, balance: 0, currency: 'INR' });
  }

  return user;
}

export async function rejectExpert(userId: string, reason?: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  // Keep as user role, mark inactive
  user.isActive = false;
  await user.save();

  return { user, reason };
}

export async function suspendExpert(userId: string) {
  const user = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });
  if (!user) throw ApiError.notFound('Expert not found');

  // Set offline
  await CallerProfile.findOneAndUpdate({ userId }, { isOnline: false });

  return user;
}

export async function activateExpert(userId: string) {
  const user = await User.findByIdAndUpdate(userId, { isBlocked: false }, { new: true });
  if (!user) throw ApiError.notFound('Expert not found');
  return user;
}

export async function deleteExpert(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Expert not found');

  await Promise.all([
    CallerProfile.deleteOne({ userId }),
    Wallet.deleteOne({ userId }),
    Notification.deleteMany({ userId }),
  ]);

  await User.findByIdAndDelete(userId);
  return { message: 'Expert deleted successfully' };
}

export async function getExpertEarnings(userId: string, query: { page?: number; limit?: number }) {
  const profile = await CallerProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('Expert profile not found');

  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const wallet = await Wallet.findOne({ userId });

  const [transactions, ledgerEntries] = await Promise.all([
    WalletTransaction.find({ userId, type: { $in: ['earning', 'withdrawal'] } })
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    LedgerEntry.find({ userId, type: { $in: ['call_earning', 'withdrawal'] } })
      .sort({ createdAt: -1 }).limit(50),
  ]);

  // Calculate summary
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const earningEntries = await LedgerEntry.find({ userId, type: 'call_earning' });

  const todayEarnings = earningEntries
    .filter((e) => e.createdAt >= todayStart)
    .reduce((sum, e) => sum + e.amountPaise, 0) / 100;
  const weekEarnings = earningEntries
    .filter((e) => e.createdAt >= weekStart)
    .reduce((sum, e) => sum + e.amountPaise, 0) / 100;
  const monthEarnings = earningEntries
    .filter((e) => e.createdAt >= monthStart)
    .reduce((sum, e) => sum + e.amountPaise, 0) / 100;

  return {
    profile,
    wallet,
    summary: {
      totalEarnings: profile.totalEarnings,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      balance: wallet?.balance || 0,
    },
    transactions,
    ledgerEntries,
  };
}

export async function getExpertSessions(userId: string, query: { page?: number; limit?: number }) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    CallSession.find({ callerId: userId })
      .populate('customerId', 'name email avatar')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    CallSession.countDocuments({ callerId: userId }),
  ]);

  return { sessions, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── Profile Update Request Management ───────────────────────────────

export async function getPendingProfileUpdates(query: { page?: number; limit?: number }) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    ProfileUpdateRequest.find({ status: 'pending' })
      .populate('callerId', 'name email avatar')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    ProfileUpdateRequest.countDocuments({ status: 'pending' }),
  ]);

  return { requests, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function approveProfileUpdate(requestId: string) {
  const request = await ProfileUpdateRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Profile update request not found');
  if (request.status !== 'pending') throw ApiError.badRequest('Request already processed');

  // Apply updates to CallerProfile
  const updateData = request.requestedChanges || {};
  await CallerProfile.findOneAndUpdate({ userId: request.userId }, updateData);

  request.status = 'approved' as any;
  await request.save();

  return request;
}

export async function rejectProfileUpdate(requestId: string, reason?: string) {
  const request = await ProfileUpdateRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Profile update request not found');
  if (request.status !== 'pending') throw ApiError.badRequest('Request already processed');

  request.status = 'rejected' as any;
  await request.save();

  return { request, reason };
}
