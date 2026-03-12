/**
 * User Management Controller — admin endpoints for managing platform users.
 */
import { Request, Response } from 'express';
import * as userManagementService from '../../services/admin/userManagementService';
import { asyncHandler } from '../../utils/asyncHandler';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userManagementService.listUsers(req.query as any);
  res.json({ success: true, data: result });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userManagementService.getUserById(req.params.userId);
  res.json({ success: true, data: user });
});

export const banUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userManagementService.banUser(req.params.userId);
  res.json({ success: true, data: user, message: 'User banned' });
});

export const unbanUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userManagementService.unbanUser(req.params.userId);
  res.json({ success: true, data: user, message: 'User unbanned' });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await userManagementService.deleteUser(req.params.userId);
  res.json({ success: true, ...result });
});

export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const result = await userManagementService.getUserActivity(req.params.userId, req.query as any);
  res.json({ success: true, data: result });
});
