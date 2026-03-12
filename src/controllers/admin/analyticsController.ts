/**
 * Analytics Controller — admin endpoints for platform analytics.
 */
import { Request, Response } from 'express';
import * as analyticsService from '../../services/admin/analyticsService';
import { asyncHandler } from '../../utils/asyncHandler';

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await analyticsService.getDashboardStats();
  res.json({ success: true, data: stats });
});

export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getRevenueAnalytics(req.query as any);
  res.json({ success: true, data: result });
});

export const getTrafficAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getTrafficAnalytics(req.query as any);
  res.json({ success: true, data: result });
});
