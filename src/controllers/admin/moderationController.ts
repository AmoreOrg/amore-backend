/**
 * Moderation Controller — admin endpoints for managing reports.
 */
import { Request, Response } from 'express';
import * as moderationService from '../../services/admin/moderationService';
import { asyncHandler } from '../../utils/asyncHandler';

export const listReports = asyncHandler(async (req: Request, res: Response) => {
  const result = await moderationService.listReports(req.query as any);
  res.json({ success: true, data: result });
});

export const getReportById = asyncHandler(async (req: Request, res: Response) => {
  const report = await moderationService.getReportById(req.params.reportId);
  res.json({ success: true, data: report });
});

export const resolveReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await moderationService.resolveReport(req.params.reportId, req.admin!.id, req.body);
  res.json({ success: true, data: report, message: 'Report resolved' });
});
