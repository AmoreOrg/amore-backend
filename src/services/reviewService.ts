/**
 * Review Service — manages post-call ratings and feedback.
 */
import { Review, CallerProfile, CallSession } from '../models';
import { ApiError } from '../utils/ApiError';

/**
 * Submit a review after a completed call.
 */
export async function submitReview(customerId: string, data: {
  callSessionId: string;
  rating: number;
  comment?: string;
}) {
  // Verify the call exists and belongs to this customer
  const session = await CallSession.findById(data.callSessionId);
  if (!session) throw ApiError.notFound('Call session not found');
  if (session.customerId.toString() !== customerId) throw ApiError.forbidden('Not your call');
  if (session.status !== 'completed') throw ApiError.badRequest('Can only review completed calls');

  // Check for existing review
  const existing = await Review.findOne({ callSessionId: data.callSessionId });
  if (existing) throw ApiError.conflict('Review already submitted for this call');

  const review = await Review.create({
    callSessionId: data.callSessionId,
    callerId: session.callerId,
    customerId,
    rating: data.rating,
    comment: data.comment || '',
  });

  // Update caller's average rating
  const allReviews = await Review.find({ callerId: session.callerId });
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  await CallerProfile.findOneAndUpdate(
    { userId: session.callerId },
    { rating: Math.round(avgRating * 10) / 10 },
  );

  return review;
}

/**
 * Get all reviews for a caller with pagination.
 */
export async function getCallerReviews(callerId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ callerId })
      .populate('customerId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ callerId }),
  ]);

  return {
    reviews,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}
