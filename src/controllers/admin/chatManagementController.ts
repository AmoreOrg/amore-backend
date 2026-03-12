/**
 * Chat Management Controller — admin endpoints for managing chat messages.
 */
import { Request, Response } from 'express';
import * as chatManagementService from '../../services/admin/chatManagementService';
import { asyncHandler } from '../../utils/asyncHandler';

export const getChatMessages = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatManagementService.getChatMessages(req.query as any);
  res.json({ success: true, data: result });
});

export const getFlaggedMessages = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatManagementService.getFlaggedMessages(req.query as any);
  res.json({ success: true, data: result });
});

export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatManagementService.deleteMessage(req.params.messageId);
  res.json({ success: true, ...result });
});
