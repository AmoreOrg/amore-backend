/**
 * Admin Management Service — CRUD operations on admin accounts and role assignments.
 */
import bcrypt from 'bcryptjs';
import { AdminUser } from '../../models/AdminUser';
import { Role } from '../../models/Role';
import { Permission } from '../../models/Permission';
import { ApiError } from '../../utils/ApiError';

const SALT_ROUNDS = 12;

export async function listAdmins(query: { page?: number; limit?: number; search?: string }) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [admins, total] = await Promise.all([
    AdminUser.find(filter)
      .populate({ path: 'role', select: 'name slug' })
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdminUser.countDocuments(filter),
  ]);

  return { admins, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getAdminById(adminId: string) {
  const admin = await AdminUser.findById(adminId)
    .populate({ path: 'role', populate: { path: 'permissions' } });
  if (!admin) throw ApiError.notFound('Admin not found');
  return admin;
}

export async function createAdmin(data: {
  name: string;
  email: string;
  password: string;
  roleId: string;
}, createdBy: string) {
  const existing = await AdminUser.findOne({ email: data.email });
  if (existing) throw ApiError.conflict('Email already registered');

  const role = await Role.findById(data.roleId);
  if (!role) throw ApiError.badRequest('Invalid role');

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const admin = await AdminUser.create({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: data.roleId,
    createdBy,
  });

  return AdminUser.findById(admin._id).populate({ path: 'role', select: 'name slug' });
}

export async function updateAdmin(adminId: string, data: { name?: string; email?: string; isActive?: boolean }) {
  const admin = await AdminUser.findById(adminId);
  if (!admin) throw ApiError.notFound('Admin not found');

  if (data.email && data.email !== admin.email) {
    const existing = await AdminUser.findOne({ email: data.email });
    if (existing) throw ApiError.conflict('Email already in use');
  }

  const updated = await AdminUser.findByIdAndUpdate(adminId, { $set: data }, { new: true })
    .populate({ path: 'role', select: 'name slug' });

  return updated;
}

export async function deleteAdmin(adminId: string, requestingAdminId: string) {
  if (adminId === requestingAdminId) {
    throw ApiError.badRequest('Cannot delete your own account');
  }

  const admin = await AdminUser.findById(adminId).populate('role');
  if (!admin) throw ApiError.notFound('Admin not found');

  // Prevent deleting the last SUPER_ADMIN
  const role = admin.role as any;
  if (role?.slug === 'SUPER_ADMIN') {
    const superAdminCount = await AdminUser.countDocuments({ role: role._id, isActive: true });
    if (superAdminCount <= 1) {
      throw ApiError.badRequest('Cannot delete the last Super Admin');
    }
  }

  await AdminUser.findByIdAndDelete(adminId);
  return { message: 'Admin deleted successfully' };
}

export async function assignRole(adminId: string, roleId: string) {
  const admin = await AdminUser.findById(adminId);
  if (!admin) throw ApiError.notFound('Admin not found');

  const role = await Role.findById(roleId);
  if (!role) throw ApiError.badRequest('Invalid role');

  admin.role = roleId as any;
  await admin.save();

  return AdminUser.findById(adminId).populate({ path: 'role', populate: { path: 'permissions' } });
}

// ─── Role & Permission Management ────────────────────────────────────

export async function listRoles() {
  return Role.find().populate('permissions').sort({ name: 1 });
}

export async function getRoleById(roleId: string) {
  const role = await Role.findById(roleId).populate('permissions');
  if (!role) throw ApiError.notFound('Role not found');
  return role;
}

export async function listPermissions() {
  return Permission.find().sort({ group: 1, code: 1 });
}
