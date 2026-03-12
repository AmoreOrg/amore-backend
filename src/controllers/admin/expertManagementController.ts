/**
 * Expert Management Controller — admin endpoints for managing experts.
 */
import { Request, Response } from 'express';
import * as expertManagementService from '../../services/admin/expertManagementService';
import { asyncHandler } from '../../utils/asyncHandler';

export const listExperts = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.listExperts(req.query as any);
  res.json({ success: true, data: result });
});

export const getExpertById = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.getExpertById(req.params.userId);
  res.json({ success: true, data: result });
});

export const approveExpert = asyncHandler(async (req: Request, res: Response) => {
  const user = await expertManagementService.approveExpert(req.params.userId);
  res.json({ success: true, data: user, message: 'Expert approved' });
});

export const rejectExpert = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.rejectExpert(req.params.userId, req.body.reason);
  res.json({ success: true, data: result, message: 'Expert rejected' });
});

export const suspendExpert = asyncHandler(async (req: Request, res: Response) => {
  const user = await expertManagementService.suspendExpert(req.params.userId);
  res.json({ success: true, data: user, message: 'Expert suspended' });
});

export const activateExpert = asyncHandler(async (req: Request, res: Response) => {
  const user = await expertManagementService.activateExpert(req.params.userId);
  res.json({ success: true, data: user, message: 'Expert activated' });
});

export const deleteExpert = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.deleteExpert(req.params.userId);
  res.json({ success: true, ...result });
});

export const getExpertEarnings = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.getExpertEarnings(req.params.userId, req.query as any);
  res.json({ success: true, data: result });
});

export const getExpertSessions = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.getExpertSessions(req.params.userId, req.query as any);
  res.json({ success: true, data: result });
});

export const getPendingProfileUpdates = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.getPendingProfileUpdates(req.query as any);
  res.json({ success: true, data: result });
});

export const approveProfileUpdate = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.approveProfileUpdate(req.params.requestId);
  res.json({ success: true, data: result, message: 'Profile update approved' });
});

export const rejectProfileUpdate = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertManagementService.rejectProfileUpdate(req.params.requestId, req.body.reason);
  res.json({ success: true, data: result, message: 'Profile update rejected' });
});
