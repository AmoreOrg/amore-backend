/**
 * Auth Service — handles registration, login, token generation and refresh.
 * Passwords are hashed with bcrypt; JWTs use access + refresh token pattern.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models';
import { Wallet } from '../models';
import { ApiError } from '../utils/ApiError';
import { AuthPayload } from '../middlewares/auth';

const SALT_ROUNDS = 12;

/**
 * Generate access + refresh token pair for a user.
 */
function generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
  const payload: AuthPayload = { userId: user._id.toString(), role: user.role };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry as string,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry as string,
  });

  return { accessToken, refreshToken };
}

/**
 * Register a new user — creates user document + wallet.
 * Role is always 'user'. Experts are onboarded from admin dashboard.
 */
export async function register(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  languages: string[];
  dob: string; // ISO date string
}) {
  // Age validation — must be 18+
  const dobDate = new Date(data.dob);
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const monthDiff = today.getMonth() - dobDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
    age--;
  }
  if (age < 18) {
    throw ApiError.badRequest('You must be at least 18 years old to register');
  }

  const existing = await User.findOne({ $or: [{ email: data.email }, { phone: data.phone }] });
  if (existing) throw ApiError.conflict('Email or phone already registered');

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: hashedPassword,
    role: 'user', // Always 'user' — experts onboarded via admin
    languages: data.languages,
    dob: dobDate,
    phoneOtp: otp,
    phoneOtpExpiry: otpExpiry,
    isPhoneVerified: false,
  });

  // Create wallet for every user
  await Wallet.create({ userId: user._id });

  // TODO: Send OTP via SMS provider (Twilio, MSG91, etc.)
  console.log(`[OTP] Phone: ${data.phone}, OTP: ${otp}`);

  return {
    userId: user._id,
    phone: user.phone,
    message: 'OTP sent to your phone number',
  };
}

/**
 * Verify phone OTP and complete registration.
 */
export async function verifyOtp(userId: string, otp: string) {
  const user = await User.findById(userId).select('+phoneOtp +phoneOtpExpiry');
  if (!user) throw ApiError.notFound('User not found');

  if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked');

  if (!user.phoneOtp || !user.phoneOtpExpiry) {
    throw ApiError.badRequest('No OTP request found. Please register again.');
  }

  if (new Date() > user.phoneOtpExpiry) {
    throw ApiError.badRequest('OTP has expired. Please request a new one.');
  }

  if (user.phoneOtp !== otp) {
    throw ApiError.badRequest('Invalid OTP');
  }

  // Mark phone as verified and clear OTP
  user.isPhoneVerified = true;
  user.phoneOtp = undefined;
  user.phoneOtpExpiry = undefined;
  await user.save();

  const tokens = generateTokens(user);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      languages: user.languages,
      dob: user.dob,
    },
    ...tokens,
  };
}

/**
 * Resend OTP for phone verification.
 */
export async function resendOtp(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.isPhoneVerified) throw ApiError.badRequest('Phone already verified');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.phoneOtp = otp;
  user.phoneOtpExpiry = otpExpiry;
  await user.save();

  // TODO: Send OTP via SMS provider
  console.log(`[OTP-RESEND] Phone: ${user.phone}, OTP: ${otp}`);

  return { message: 'OTP resent successfully' };
}

/**
 * Login with email + password.
 */
export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked');
  if (!user.isPhoneVerified) throw ApiError.forbidden('Please verify your phone number first');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  const tokens = generateTokens(user);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      languages: user.languages,
      dob: user.dob,
    },
    ...tokens,
  };
}

/**
 * Refresh the access token using a valid refresh token.
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as AuthPayload;
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const tokens = generateTokens(user);
    await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

    return tokens;
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}

/**
 * Update FCM token for push notifications.
 */
export async function updateFcmToken(userId: string, fcmToken: string) {
  await User.findByIdAndUpdate(userId, { fcmToken });
}

/**
 * Get user profile by ID.
 */
export async function getProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    languages: user.languages,
    dob: user.dob,
  };
}

/**
 * Update user profile — only name, dob, and languages are editable.
 * Email and phone cannot be changed.
 */
export async function updateProfile(
  userId: string,
  data: { name?: string; dob?: string; languages?: string[] },
) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (data.name !== undefined) {
    if (!data.name.trim()) throw ApiError.badRequest('Name cannot be empty');
    user.name = data.name.trim();
  }

  if (data.dob !== undefined) {
    const dobDate = new Date(data.dob);
    if (isNaN(dobDate.getTime())) throw ApiError.badRequest('Invalid date of birth');
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (age < 18) throw ApiError.badRequest('You must be at least 18 years old');
    user.dob = dobDate;
  }

  if (data.languages !== undefined) {
    user.languages = data.languages.filter((l) => l.trim());
  }

  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    languages: user.languages,
    dob: user.dob,
  };
}
