/**
 * Transaction Controller — admin endpoints for managing transactions.
 */
import { Request, Response } from 'express';
import * as transactionService from '../../services/admin/transactionService';
import { asyncHandler } from '../../utils/asyncHandler';

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const result = await transactionService.listTransactions(req.query as any);
  res.json({ success: true, data: result });
});

export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await transactionService.getTransactionById(req.params.transactionId);
  res.json({ success: true, data: transaction });
});

export const exportTransactions = asyncHandler(async (req: Request, res: Response) => {
  const result = await transactionService.exportTransactions(req.query as any);
  res.json({ success: true, data: result });
});

export const processRefund = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  const transaction = await transactionService.processRefund(req.params.transactionId, req.admin!.id, reason);
  res.json({ success: true, data: transaction, message: 'Refund processed' });
});
