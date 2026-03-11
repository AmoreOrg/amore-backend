/**
 * Payout Controller — HTTP handlers for withdrawal requests and admin actions.
 */
import { Request, Response } from 'express';
import * as payoutService from '../services/payoutService';
import { asyncHandler } from '../utils/asyncHandler';

export const requestPayout = asyncHandler(async (req: Request, res: Response) => {
  const payout = await payoutService.requestPayout(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: payout });
});

export const processPayout = asyncHandler(async (req: Request, res: Response) => {
  const { action, adminNote } = req.body;
  const payout = await payoutService.processPayout(req.params.payoutId, action, adminNote);
  res.json({ success: true, data: payout });
});

export const getPayoutHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await payoutService.getPayoutHistory(req.user!.userId, page, limit);
  res.json({ success: true, data: result });
});

export const getPendingPayouts = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await payoutService.getPendingPayouts(page, limit);
  res.json({ success: true, data: result });
});
