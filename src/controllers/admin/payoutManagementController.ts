/**
 * Payout Management Controller — admin endpoints for managing payouts.
 */
import { Request, Response } from 'express';
import * as payoutManagementService from '../../services/admin/payoutManagementService';
import { asyncHandler } from '../../utils/asyncHandler';

export const listPayouts = asyncHandler(async (req: Request, res: Response) => {
  const result = await payoutManagementService.listPayouts(req.query as any);
  res.json({ success: true, data: result });
});

export const getPayoutById = asyncHandler(async (req: Request, res: Response) => {
  const payout = await payoutManagementService.getPayoutById(req.params.payoutId);
  res.json({ success: true, data: payout });
});

export const approvePayout = asyncHandler(async (req: Request, res: Response) => {
  const payout = await payoutManagementService.approvePayout(req.params.payoutId, req.admin!.id);
  res.json({ success: true, data: payout, message: 'Payout approved' });
});

export const rejectPayout = asyncHandler(async (req: Request, res: Response) => {
  const result = await payoutManagementService.rejectPayout(req.params.payoutId, req.admin!.id, req.body.reason);
  res.json({ success: true, data: result, message: 'Payout rejected' });
});

export const releasePayout = asyncHandler(async (req: Request, res: Response) => {
  const payout = await payoutManagementService.releasePayout(req.params.payoutId, req.admin!.id);
  res.json({ success: true, data: payout, message: 'Payout released' });
});
