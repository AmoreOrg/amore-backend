/**
 * Wallet Controller — HTTP handlers for wallet operations.
 */
import { Request, Response } from 'express';
import * as walletService from '../services/walletService';
import { asyncHandler } from '../utils/asyncHandler';

export const getBalance = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.getBalance(req.user!.userId);
  res.json({ success: true, data: result });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body;
  const result = await walletService.createRazorpayOrder(req.user!.userId, amount);
  res.json({ success: true, data: result });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const result = await walletService.verifyAndDeposit(
    req.user!.userId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  );
  res.json({ success: true, data: result });
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await walletService.getEnrichedTransactions(req.user!.userId, page, limit);
  res.json({ success: true, data: result });
});

export const checkBalance = asyncHandler(async (req: Request, res: Response) => {
  const { pricePerMinute } = req.body;
  const result = await walletService.checkSufficientBalance(req.user!.userId, pricePerMinute);
  res.json({ success: true, data: result });
});

export const getEarningsBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.getEarningsBreakdown(req.user!.userId);
  res.json({ success: true, data: result });
});
