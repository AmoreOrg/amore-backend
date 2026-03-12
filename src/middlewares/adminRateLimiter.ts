/**
 * Rate limiting configuration for admin APIs.
 * Stricter limits than public APIs to protect admin operations.
 */
import rateLimit from 'express-rate-limit';

/**
 * General admin API rate limit — 200 requests per 15 minutes per IP.
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many admin API requests, please try again later' },
});

/**
 * Strict rate limit for admin auth — 10 attempts per 15 minutes per IP.
 */
export const adminAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later' },
});

/**
 * Stricter limit for destructive operations — 30 per 15 minutes per IP.
 */
export const adminWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many write operations, please try again later' },
});
