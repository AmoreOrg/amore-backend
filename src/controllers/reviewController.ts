/**
 * Review Controller — HTTP handlers for reviews.
 */
import { Request, Response } from 'express';
import * as reviewService from '../services/reviewService';
import { asyncHandler } from '../utils/asyncHandler';

export const submitReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.submitReview(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: review });
});

export const getCallerReviews = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await reviewService.getCallerReviews(req.params.callerId, page, limit);
  res.json({ success: true, data: result });
});
