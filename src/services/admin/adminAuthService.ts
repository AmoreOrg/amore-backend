/**
 * Admin Auth Service — handles admin login, token generation, and password management.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AdminUser } from '../../models/AdminUser';
import { ApiError } from '../../utils/ApiError';
import { AdminAuthPayload } from '../../middlewares/adminAuth';

const SALT_ROUNDS = 12;

function generateAdminTokens(admin: { _id: any; email: string }): { accessToken: string; refreshToken: string } {
  const payload: AdminAuthPayload = { adminId: admin._id.toString(), email: admin.email };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: '1h',
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: '7d',
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const admin = await AdminUser.findOne({ email }).select('+password');
  if (!admin) throw ApiError.unauthorized('Invalid credentials');
  if (!admin.isActive) throw ApiError.forbidden('Account deactivated');

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) throw ApiError.unauthorized('Invalid credentials');

  const tokens = generateAdminTokens(admin);

  admin.refreshToken = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
  admin.lastLoginAt = new Date();
  await admin.save();

  const adminObj = await AdminUser.findById(admin._id).populate({ path: 'role', populate: { path: 'permissions' } });

  return { admin: adminObj, ...tokens };
}

export async function refreshAccessToken(refreshToken: string) {
  let decoded: AdminAuthPayload;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as AdminAuthPayload;
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const admin = await AdminUser.findById(decoded.adminId).select('+refreshToken');
  if (!admin || !admin.isActive || !admin.refreshToken) {
    throw ApiError.unauthorized('Admin not found or deactivated');
  }

  const isValid = await bcrypt.compare(refreshToken, admin.refreshToken);
  if (!isValid) throw ApiError.unauthorized('Invalid refresh token');

  const tokens = generateAdminTokens(admin);

  admin.refreshToken = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
  await admin.save();

  return tokens;
}

export async function changePassword(adminId: string, currentPassword: string, newPassword: string) {
  const admin = await AdminUser.findById(adminId).select('+password');
  if (!admin) throw ApiError.notFound('Admin not found');

  const isMatch = await bcrypt.compare(currentPassword, admin.password);
  if (!isMatch) throw ApiError.badRequest('Current password is incorrect');

  admin.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  admin.refreshToken = undefined;
  await admin.save();
}

export async function getProfile(adminId: string) {
  const admin = await AdminUser.findById(adminId).populate({ path: 'role', populate: { path: 'permissions' } });
  if (!admin) throw ApiError.notFound('Admin not found');
  return admin;
}
