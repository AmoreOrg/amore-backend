/**
 * User model — core authentication entity.
 * Supports both "user" (customer) and "caller" roles.
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'user' | 'caller' | 'admin';
  avatar?: string;
  languages: string[];
  dob?: Date;
  fcmToken?: string;
  isActive: boolean;
  isBlocked: boolean;
  refreshToken?: string;
  phoneOtp?: string;
  phoneOtpExpiry?: Date;
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'caller', 'admin'], default: 'user' },
    avatar: { type: String },
    languages: [{ type: String, trim: true }],
    dob: { type: Date },
    fcmToken: { type: String },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    phoneOtp: { type: String, select: false },
    phoneOtpExpiry: { type: Date, select: false },
    isPhoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Index for search & auth lookups
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
