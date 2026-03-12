/**
 * Session Management Controller — admin endpoints for managing call sessions.
 */
import { Request, Response } from 'express';
import * as sessionManagementService from '../../services/admin/sessionManagementService';
import { asyncHandler } from '../../utils/asyncHandler';

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const result = await sessionManagementService.listSessions(req.query as any);
  res.json({ success: true, data: result });
});

export const getSessionById = asyncHandler(async (req: Request, res: Response) => {
  const result = await sessionManagementService.getSessionById(req.params.sessionId);
  res.json({ success: true, data: result });
});

export const forceEndSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await sessionManagementService.forceEndSession(req.params.sessionId, req.admin!.id);
  res.json({ success: true, data: session, message: 'Session force-ended' });
});
