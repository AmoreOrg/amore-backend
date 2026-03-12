/**
 * Admin Auth Controller — admin login, token refresh, profile and password management.
 */
import { Request, Response } from 'express';
import * as adminAuthService from '../../services/admin/adminAuthService';
import { asyncHandler } from '../../utils/asyncHandler';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await adminAuthService.login(email, password);
  res.json({ success: true, data: result });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await adminAuthService.refreshAccessToken(refreshToken);
  res.json({ success: true, data: tokens });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminAuthService.getProfile(req.admin!.id);
  res.json({ success: true, data: admin });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await adminAuthService.changePassword(req.admin!.id, currentPassword, newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
});
