/**
 * Expert Verification Service — handles document verification, Aadhar verification,
 * and interview scheduling for expert onboarding.
 *
 * NOTE: This system currently uses in-memory status tracking on CallerProfile.
 * When the full verification workflow is implemented, dedicated VerificationDocument
 * and Interview models should be added.
 */
import { CallerProfile } from '../../models/CallerProfile';
import { User } from '../../models/User';
import { ApiError } from '../../utils/ApiError';

// ─── Document Verification ──────────────────────────────────────────

export async function verifyDocuments(userId: string, action: 'approve' | 'reject' | 'revise', notes?: string) {
  const profile = await CallerProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('Expert profile not found');

  // Store verification status in profile metadata
  const verificationStatus = action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'revision_needed';

  await CallerProfile.findOneAndUpdate(
    { userId },
    { $set: { 'verification.documents': { status: verificationStatus, notes, updatedAt: new Date() } } },
  );

  return { userId, documentVerification: verificationStatus, notes };
}

// ─── Aadhar Verification ────────────────────────────────────────────

export async function verifyAadhar(userId: string, action: 'approve' | 'reject' | 'revise', notes?: string) {
  const profile = await CallerProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('Expert profile not found');

  const verificationStatus = action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'revision_needed';

  await CallerProfile.findOneAndUpdate(
    { userId },
    { $set: { 'verification.aadhar': { status: verificationStatus, notes, updatedAt: new Date() } } },
  );

  return { userId, aadharVerification: verificationStatus, notes };
}

// ─── Interview Scheduling ───────────────────────────────────────────

export async function scheduleInterview(userId: string, data: {
  scheduledAt: string;
  notes?: string;
}) {
  const profile = await CallerProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('Expert profile not found');

  await CallerProfile.findOneAndUpdate(
    { userId },
    { $set: { 'verification.interview': { status: 'scheduled', scheduledAt: new Date(data.scheduledAt), notes: data.notes, updatedAt: new Date() } } },
  );

  return { userId, interviewStatus: 'scheduled', scheduledAt: data.scheduledAt };
}

export async function postponeInterview(userId: string, data: {
  newScheduledAt: string;
  reason?: string;
}) {
  const profile = await CallerProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('Expert profile not found');

  await CallerProfile.findOneAndUpdate(
    { userId },
    { $set: { 'verification.interview': { status: 'postponed', scheduledAt: new Date(data.newScheduledAt), notes: data.reason, updatedAt: new Date() } } },
  );

  return { userId, interviewStatus: 'postponed', newScheduledAt: data.newScheduledAt };
}

export async function cancelInterview(userId: string, reason?: string) {
  await CallerProfile.findOneAndUpdate(
    { userId },
    { $set: { 'verification.interview': { status: 'cancelled', notes: reason, updatedAt: new Date() } } },
  );

  return { userId, interviewStatus: 'cancelled', reason };
}

export async function completeInterview(userId: string, action: 'accept' | 'reject', notes?: string) {
  const profile = await CallerProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('Expert profile not found');

  const status = action === 'accept' ? 'passed' : 'failed';

  await CallerProfile.findOneAndUpdate(
    { userId },
    { $set: { 'verification.interview': { status, notes, updatedAt: new Date() } } },
  );

  // If interview passed, mark user as active caller
  if (action === 'accept') {
    await User.findByIdAndUpdate(userId, { role: 'caller', isActive: true });
  }

  return { userId, interviewStatus: status, notes };
}
