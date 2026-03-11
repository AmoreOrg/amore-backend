/**
 * Caller Controller — HTTP handlers for caller profile management.
 */
import { Request, Response } from 'express';
import * as callerService from '../services/callerService';
import * as profileUpdateService from '../services/profileUpdateService';
import { asyncHandler } from '../utils/asyncHandler';

export const createProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await callerService.createProfile(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await callerService.updateProfile(req.user!.userId, req.body);
  res.json({ success: true, data: profile });
});

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await callerService.getProfile(req.user!.userId);
  res.json({ success: true, data: profile });
});

export const getProfileById = asyncHandler(async (req: Request, res: Response) => {
  const profile = await callerService.getProfileById(req.params.id);
  res.json({ success: true, data: profile });
});

export const toggleOnline = asyncHandler(async (req: Request, res: Response) => {
  const isOnline = req.body?.isOnline;
  if (typeof isOnline !== 'boolean') {
    res.status(400).json({ success: false, message: 'isOnline (boolean) is required' });
    return;
  }
  const profile = await callerService.toggleOnlineStatus(req.user!.userId, isOnline);
  res.json({ success: true, data: profile });
});

export const searchCallers = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    language: req.query.language as string,
    expertise: req.query.expertise as string,
    search: req.query.search as string,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    onlineOnly: req.query.onlineOnly === 'true',
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  };
  const result = await callerService.searchCallers(filters);
  res.json({ success: true, data: result });
});

/* ---- Profile Update Requests ---- */

export const submitProfileUpdateRequest = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileUpdateService.submitUpdateRequest(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: result });
});

export const getMyUpdateRequests = asyncHandler(async (req: Request, res: Response) => {
  const result = await profileUpdateService.getMyUpdateRequests(req.user!.userId);
  res.json({ success: true, data: result });
});

export const getPendingUpdateRequests = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await profileUpdateService.getPendingRequests(page, limit);
  res.json({ success: true, data: result });
});

export const approveUpdateRequest = asyncHandler(async (req: Request, res: Response) => {
  const { adminNote } = req.body;
  const result = await profileUpdateService.approveRequest(req.params.requestId, req.user!.userId, adminNote);
  res.json({ success: true, data: result });
});

export const rejectUpdateRequest = asyncHandler(async (req: Request, res: Response) => {
  const { adminNote } = req.body;
  const result = await profileUpdateService.rejectRequest(req.params.requestId, req.user!.userId, adminNote);
  res.json({ success: true, data: result });
});
