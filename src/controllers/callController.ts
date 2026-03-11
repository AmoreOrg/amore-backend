/**
 * Call Controller — HTTP handlers for call initiation, acceptance, and history.
 */
import { Request, Response } from 'express';
import * as callService from '../services/callService';
import { asyncHandler } from '../utils/asyncHandler';

export const initiateCall = asyncHandler(async (req: Request, res: Response) => {
  const { callerProfileId, callType } = req.body;
  const result = await callService.initiateCall(req.user!.userId, callerProfileId, callType);
  res.status(201).json({ success: true, data: result });
});

export const acceptCall = asyncHandler(async (req: Request, res: Response) => {
  const session = await callService.acceptCall(req.params.callId, req.user!.userId);
  res.json({ success: true, data: session });
});

export const rejectCall = asyncHandler(async (req: Request, res: Response) => {
  const session = await callService.rejectCall(req.params.callId, req.user!.userId);
  res.json({ success: true, data: session });
});

export const endCall = asyncHandler(async (req: Request, res: Response) => {
  const reason = req.body.reason || 'user_ended';
  const session = await callService.endCall(req.params.callId, req.user!.userId, reason);
  res.json({ success: true, data: session });
});

export const getCallHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await callService.getCallHistory(req.user!.userId, page, limit);
  res.json({ success: true, data: result });
});

export const getCallSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await callService.getCallSession(req.params.callId);
  res.json({ success: true, data: session });
});

export const getRecentContacts = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await callService.getRecentContacts(req.user!.userId, page, limit);
  res.json({ success: true, data: result });
});
