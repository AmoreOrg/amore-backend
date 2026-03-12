/**
 * Analytics Service — platform analytics and metrics for the admin dashboard.
 */
import { User } from '../../models/User';
import { CallerProfile } from '../../models/CallerProfile';
import { CallSession } from '../../models/CallSession';
import { WalletTransaction } from '../../models/WalletTransaction';
import { LedgerEntry } from '../../models/LedgerEntry';
import { PayoutRequest } from '../../models/PayoutRequest';
import { Report } from '../../models/Report';

export async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    totalExperts,
    activeExperts,
    totalCalls,
    activeCalls,
    todayCalls,
    pendingPayouts,
    pendingReports,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'caller' }),
    CallerProfile.countDocuments({ isOnline: true }),
    CallSession.countDocuments(),
    CallSession.countDocuments({ status: 'active' }),
    CallSession.countDocuments({ createdAt: { $gte: todayStart } }),
    PayoutRequest.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'pending' }),
  ]);

  return {
    users: { total: totalUsers },
    experts: { total: totalExperts, active: activeExperts },
    calls: { total: totalCalls, active: activeCalls, today: todayCalls },
    pendingPayouts,
    pendingReports,
  };
}

export async function getRevenueAnalytics(query: { period?: string; startDate?: string; endDate?: string }) {
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  if (query.startDate && query.endDate) {
    startDate = new Date(query.startDate);
    endDate = new Date(query.endDate);
  } else {
    switch (query.period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

  const [
    totalDeposits,
    totalEarnings,
    platformCommission,
    totalRefunds,
    totalWithdrawals,
  ] = await Promise.all([
    LedgerEntry.aggregate([
      { $match: { ...dateFilter, type: 'deposit' } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    LedgerEntry.aggregate([
      { $match: { ...dateFilter, type: 'call_earning' } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    LedgerEntry.aggregate([
      { $match: { ...dateFilter, type: 'platform_commission' } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    LedgerEntry.aggregate([
      { $match: { ...dateFilter, type: 'refund' } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    LedgerEntry.aggregate([
      { $match: { ...dateFilter, type: 'withdrawal' } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
  ]);

  // Daily revenue breakdown
  const dailyRevenue = await LedgerEntry.aggregate([
    { $match: { ...dateFilter, type: 'platform_commission' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$amountPaise' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    period: { start: startDate, end: endDate },
    totalDeposits: totalDeposits[0]?.total || 0,
    totalEarnings: totalEarnings[0]?.total || 0,
    platformCommission: platformCommission[0]?.total || 0,
    totalRefunds: totalRefunds[0]?.total || 0,
    totalWithdrawals: totalWithdrawals[0]?.total || 0,
    dailyRevenue,
  };
}

export async function getTrafficAnalytics(query: { period?: string; startDate?: string; endDate?: string }) {
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  if (query.startDate && query.endDate) {
    startDate = new Date(query.startDate);
    endDate = new Date(query.endDate);
  } else {
    switch (query.period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

  const [newUsers, newExperts, callStats, dailySignups] = await Promise.all([
    User.countDocuments({ ...dateFilter, role: 'user' }),
    User.countDocuments({ ...dateFilter, role: 'caller' }),
    CallSession.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDuration: { $sum: '$durationSeconds' },
        },
      },
    ]),
    User.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          users: { $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] } },
          experts: { $sum: { $cond: [{ $eq: ['$role', 'caller'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    period: { start: startDate, end: endDate },
    newUsers,
    newExperts,
    callStats,
    dailySignups,
  };
}
