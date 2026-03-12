/**
 * System Controller — admin endpoints for system config and audit logs.
 */
import { Request, Response } from 'express';
import * as systemService from '../../services/admin/systemService';
import { asyncHandler } from '../../utils/asyncHandler';

export const listConfigs = asyncHandler(async (_req: Request, res: Response) => {
  const configs = await systemService.listConfigs();
  res.json({ success: true, data: configs });
});

export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await systemService.getConfig(req.params.key);
  res.json({ success: true, data: config });
});

export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await systemService.updateConfig(req.params.key, req.body.value, req.admin!.id);
  res.json({ success: true, data: config, message: 'Config updated' });
});

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await systemService.listAuditLogs(req.query as any);
  res.json({ success: true, data: result });
});
