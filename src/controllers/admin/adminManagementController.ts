/**
 * Admin Management Controller — admin endpoints for managing admin accounts and roles.
 */
import { Request, Response } from 'express';
import * as adminManagementService from '../../services/admin/adminManagementService';
import { asyncHandler } from '../../utils/asyncHandler';

export const listAdmins = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminManagementService.listAdmins(req.query as any);
  res.json({ success: true, data: result });
});

export const getAdminById = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminManagementService.getAdminById(req.params.adminId);
  res.json({ success: true, data: admin });
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminManagementService.createAdmin(req.body, req.admin!.id);
  res.status(201).json({ success: true, data: admin, message: 'Admin created' });
});

export const updateAdmin = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminManagementService.updateAdmin(req.params.adminId, req.body);
  res.json({ success: true, data: admin, message: 'Admin updated' });
});

export const deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminManagementService.deleteAdmin(req.params.adminId, req.admin!.id);
  res.json({ success: true, ...result });
});

export const assignRole = asyncHandler(async (req: Request, res: Response) => {
  const admin = await adminManagementService.assignRole(req.params.adminId, req.body.roleId);
  res.json({ success: true, data: admin, message: 'Role assigned' });
});

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await adminManagementService.listRoles();
  res.json({ success: true, data: roles });
});

export const getRoleById = asyncHandler(async (req: Request, res: Response) => {
  const role = await adminManagementService.getRoleById(req.params.roleId);
  res.json({ success: true, data: role });
});

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await adminManagementService.listPermissions();
  res.json({ success: true, data: permissions });
});
