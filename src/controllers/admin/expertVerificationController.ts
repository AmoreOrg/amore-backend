/**
 * Expert Verification Controller — admin endpoints for document/Aadhar verification and interviews.
 */
import { Request, Response } from 'express';
import * as expertVerificationService from '../../services/admin/expertVerificationService';
import { asyncHandler } from '../../utils/asyncHandler';

export const verifyDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { action, notes } = req.body;
  const result = await expertVerificationService.verifyDocuments(req.params.userId, action, notes);
  res.json({ success: true, data: result });
});

export const verifyAadhar = asyncHandler(async (req: Request, res: Response) => {
  const { action, notes } = req.body;
  const result = await expertVerificationService.verifyAadhar(req.params.userId, action, notes);
  res.json({ success: true, data: result });
});

export const scheduleInterview = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertVerificationService.scheduleInterview(req.params.userId, req.body);
  res.json({ success: true, data: result });
});

export const postponeInterview = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertVerificationService.postponeInterview(req.params.userId, req.body);
  res.json({ success: true, data: result });
});

export const cancelInterview = asyncHandler(async (req: Request, res: Response) => {
  const result = await expertVerificationService.cancelInterview(req.params.userId, req.body.reason);
  res.json({ success: true, data: result });
});

export const completeInterview = asyncHandler(async (req: Request, res: Response) => {
  const { action, notes } = req.body;
  const result = await expertVerificationService.completeInterview(req.params.userId, action, notes);
  res.json({ success: true, data: result });
});
