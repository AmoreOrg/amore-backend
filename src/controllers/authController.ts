/**
 * Auth Controller — HTTP handlers for authentication endpoints.
 */
import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { asyncHandler } from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json({ success: true, data: result });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);
  res.json({ success: true, data: tokens });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.userId);
  res.json({ success: true, data: user });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { userId, otp } = req.body;
  const result = await authService.verifyOtp(userId, otp);
  res.json({ success: true, data: result });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;
  const result = await authService.resendOtp(userId);
  res.json({ success: true, data: result });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, dob, languages } = req.body;
  const result = await authService.updateProfile(req.user!.userId, { name, dob, languages });
  res.json({ success: true, data: result });
});

export const updateFcmToken = asyncHandler(async (req: Request, res: Response) => {
  await authService.updateFcmToken(req.user!.userId, req.body.fcmToken);
  res.json({ success: true, message: 'FCM token updated' });
});
