/**
 * Notification Controller — HTTP handlers for notification management.
 */
import { Request, Response } from 'express';
import * as notificationService from '../services/notificationService';
import { asyncHandler } from '../utils/asyncHandler';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await notificationService.getUserNotifications(req.user!.userId, page, limit);
  res.json({ success: true, data: result });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAsRead(req.params.id, req.user!.userId);
  res.json({ success: true, message: 'Notification marked as read' });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllAsRead(req.user!.userId);
  res.json({ success: true, message: 'All notifications marked as read' });
});
