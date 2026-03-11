/**
 * Caller Service — manages caller profiles, online status, and search.
 */
import { CallerProfile, ICallerProfile } from '../models';
import { ApiError } from '../utils/ApiError';

/**
 * Create a new caller profile for a user with role 'caller'.
 */
export async function createProfile(userId: string, data: {
  bio: string;
  languages: string[];
  expertise: string[];
  experience: string;
  pricePerMinute: number;
}) {
  const existing = await CallerProfile.findOne({ userId });
  if (existing) throw ApiError.conflict('Caller profile already exists');

  const profile = await CallerProfile.create({ userId, ...data });
  return profile;
}

/**
 * Update caller profile fields.
 */
export async function updateProfile(userId: string, updates: Partial<{
  bio: string;
  languages: string[];
  expertise: string[];
  experience: string;
  pricePerMinute: number;
}>) {
  const profile = await CallerProfile.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true },
  );
  if (!profile) throw ApiError.notFound('Caller profile not found');
  return profile;
}

/**
 * Get a single caller profile by userId.
 */
export async function getProfile(userId: string) {
  const profile = await CallerProfile.findOne({ userId }).populate('userId', 'name email avatar');
  if (!profile) throw ApiError.notFound('Caller profile not found');
  return profile;
}

/**
 * Get caller profile by profile ID.
 */
export async function getProfileById(profileId: string) {
  const profile = await CallerProfile.findById(profileId).populate('userId', 'name email avatar');
  if (!profile) throw ApiError.notFound('Caller profile not found');
  return profile;
}

/**
 * Toggle caller online/offline status.
 */
export async function toggleOnlineStatus(userId: string, isOnline: boolean) {
  const profile = await CallerProfile.findOneAndUpdate(
    { userId },
    { isOnline },
    { new: true },
  );
  if (!profile) throw ApiError.notFound('Caller profile not found');
  return profile;
}

/**
 * Search callers with filters — supports language, expertise, price range, and online status.
 */
export async function searchCallers(filters: {
  language?: string;
  expertise?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  onlineOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  const query: any = {};

  if (filters.language) {
    query.languages = { $in: [filters.language] };
  }
  if (filters.expertise) {
    query.expertise = { $in: [filters.expertise] };
  }
  if (filters.onlineOnly) {
    query.isOnline = true;
  }
  if (filters.minPrice || filters.maxPrice) {
    query.pricePerMinute = {};
    if (filters.minPrice) query.pricePerMinute.$gte = filters.minPrice;
    if (filters.maxPrice) query.pricePerMinute.$lte = filters.maxPrice;
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  // If text search is provided, find matching user IDs first
  let userIdFilter: any = undefined;
  if (filters.search) {
    const { User } = require('../models');
    const regex = new RegExp(filters.search, 'i');
    const matchingUsers = await User.find({
      $or: [{ name: regex }],
      role: 'caller',
    }).select('_id');
    const userIds = matchingUsers.map((u: any) => u._id);

    // Also search in expertise and bio
    query.$or = [
      { userId: { $in: userIds } },
      { expertise: { $in: [regex] } },
      { bio: regex },
    ];
  }

  const [callers, total] = await Promise.all([
    CallerProfile.find(query)
      .populate('userId', 'name email avatar')
      .sort({ rating: -1, totalCalls: -1 })
      .skip(skip)
      .limit(limit),
    CallerProfile.countDocuments(query),
  ]);

  return {
    callers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
