/**
 * Profile Update Request Service — handles expert profile update requests
 * that require admin approval before taking effect.
 */
import { ProfileUpdateRequest, CallerProfile } from '../models';
import { ApiError } from '../utils/ApiError';

/**
 * Submit a profile update request (expert side).
 */
export async function submitUpdateRequest(
  userId: string,
  changes: {
    bio?: string;
    languages?: string[];
    expertise?: string[];
    experience?: string;
    pricePerMinute?: number;
  },
) {
  // Check for existing pending request
  const existing = await ProfileUpdateRequest.findOne({ userId, status: 'pending' });
  if (existing) {
    throw ApiError.conflict('You already have a pending update request. Please wait for admin review.');
  }

  const request = await ProfileUpdateRequest.create({
    userId,
    requestedChanges: changes,
  });

  return request;
}

/**
 * Get all update requests for a specific expert.
 */
export async function getMyUpdateRequests(userId: string) {
  const requests = await ProfileUpdateRequest.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20);
  return requests;
}

/**
 * Get all pending update requests (admin).
 */
export async function getPendingRequests(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    ProfileUpdateRequest.find({ status: 'pending' })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ProfileUpdateRequest.countDocuments({ status: 'pending' }),
  ]);

  return {
    requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Approve an update request — applies the changes to CallerProfile.
 */
export async function approveRequest(requestId: string, adminId: string, adminNote?: string) {
  const request = await ProfileUpdateRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Update request not found');
  if (request.status !== 'pending') throw ApiError.badRequest('Request is not pending');

  // Apply changes to CallerProfile
  const updates: any = {};
  const changes = request.requestedChanges;
  if (changes.bio !== undefined) updates.bio = changes.bio;
  if (changes.languages && changes.languages.length > 0) updates.languages = changes.languages;
  if (changes.expertise && changes.expertise.length > 0) updates.expertise = changes.expertise;
  if (changes.experience !== undefined) updates.experience = changes.experience;
  if (changes.pricePerMinute !== undefined) updates.pricePerMinute = changes.pricePerMinute;

  await CallerProfile.findOneAndUpdate({ userId: request.userId }, { $set: updates });

  request.status = 'approved';
  request.reviewedBy = adminId as any;
  request.reviewedAt = new Date();
  if (adminNote) request.adminNote = adminNote;
  await request.save();

  return request;
}

/**
 * Reject an update request.
 */
export async function rejectRequest(requestId: string, adminId: string, adminNote?: string) {
  const request = await ProfileUpdateRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Update request not found');
  if (request.status !== 'pending') throw ApiError.badRequest('Request is not pending');

  request.status = 'rejected';
  request.reviewedBy = adminId as any;
  request.reviewedAt = new Date();
  if (adminNote) request.adminNote = adminNote;
  await request.save();

  return request;
}
