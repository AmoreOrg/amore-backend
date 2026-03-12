/**
 * Centralized permissions and role definitions for the RBAC system.
 * All atomic permissions are defined here with their metadata.
 */

export interface PermissionDef {
  code: string;
  name: string;
  group: string;
  description: string;
}

// ─── Atomic Permissions ──────────────────────────────────────────────────

export const PERMISSIONS: PermissionDef[] = [
  // User Management
  { code: 'user.view', name: 'View Users', group: 'User Management', description: 'View user details' },
  { code: 'user.ban', name: 'Ban User', group: 'User Management', description: 'Ban a user' },
  { code: 'user.unban', name: 'Unban User', group: 'User Management', description: 'Unban a banned user' },
  { code: 'user.delete', name: 'Delete User', group: 'User Management', description: 'Remove user from database' },
  { code: 'user.view_activity', name: 'View User Activity', group: 'User Management', description: 'View user activity history' },

  // Expert Management
  { code: 'expert.view', name: 'View Experts', group: 'Expert Management', description: 'View expert details' },
  { code: 'expert.application_view', name: 'View Applications', group: 'Expert Management', description: 'View expert signup applications' },
  { code: 'expert.approve', name: 'Approve Expert', group: 'Expert Management', description: 'Accept expert application and onboard to platform' },
  { code: 'expert.reject', name: 'Reject Expert', group: 'Expert Management', description: 'Reject expert application' },
  { code: 'expert.update_profile', name: 'Update Expert Profile', group: 'Expert Management', description: 'Accept/reject expert profile update requests' },
  { code: 'expert.suspend', name: 'Suspend Expert', group: 'Expert Management', description: 'Suspend an expert' },
  { code: 'expert.activate', name: 'Activate Expert', group: 'Expert Management', description: 'Unsuspend/activate an expert' },
  { code: 'expert.delete', name: 'Delete Expert', group: 'Expert Management', description: 'Remove expert from database' },
  { code: 'expert.view_earnings', name: 'View Expert Earnings', group: 'Expert Management', description: 'View expert earnings and history' },
  { code: 'expert.view_sessions', name: 'View Expert Sessions', group: 'Expert Management', description: 'View expert login sessions history' },

  // Expert Verification
  { code: 'expert.verify_documents', name: 'Verify Documents', group: 'Expert Verification', description: 'Accept/reject/revise pending expert verification documents' },
  { code: 'expert.verify_aadhar', name: 'Verify Aadhar', group: 'Expert Verification', description: 'Accept/reject/revise pending expert Aadhar verification documents' },
  { code: 'expert.interview_schedule', name: 'Schedule Interview', group: 'Expert Verification', description: 'Schedule/postpone/cancel interviews for pending experts' },
  { code: 'expert.interview_complete', name: 'Complete Interview', group: 'Expert Verification', description: 'Accept/reject interview status for onboarding expert' },

  // Session Management
  { code: 'session.force_end', name: 'Force End Session', group: 'Session Management', description: 'Force end an active call session' },

  // Chat Management
  { code: 'chat.view', name: 'View Chats', group: 'Chat Management', description: 'View chat messages' },
  { code: 'chat.view_flagged', name: 'View Flagged Chats', group: 'Chat Management', description: 'View flagged chat messages' },
  { code: 'chat.delete_message', name: 'Delete Message', group: 'Chat Management', description: 'Delete a chat message' },

  // Moderation
  { code: 'report.view', name: 'View Reports', group: 'Moderation', description: 'View user reports' },
  { code: 'report.resolve', name: 'Resolve Report', group: 'Moderation', description: 'Resolve a report' },

  // Payments
  { code: 'transaction.view', name: 'View Transactions', group: 'Payments', description: 'View transactions' },
  { code: 'transaction.export', name: 'Export Transactions', group: 'Payments', description: 'Export transaction data' },
  { code: 'transaction.refund', name: 'Refund Transaction', group: 'Payments', description: 'Process a refund' },

  // Payouts
  { code: 'payout.view', name: 'View Payouts', group: 'Payouts', description: 'View payout requests' },
  { code: 'payout.approve', name: 'Approve Payout', group: 'Payouts', description: 'Approve a payout request' },
  { code: 'payout.reject', name: 'Reject Payout', group: 'Payouts', description: 'Reject a payout request' },
  { code: 'payout.release', name: 'Release Payout', group: 'Payouts', description: 'Release funds for an approved payout' },

  // Analytics
  { code: 'analytics.view', name: 'View Analytics', group: 'Analytics', description: 'View platform analytics' },
  { code: 'analytics.revenue', name: 'View Revenue', group: 'Analytics', description: 'View revenue analytics' },
  { code: 'analytics.traffic', name: 'View Traffic', group: 'Analytics', description: 'View traffic analytics' },

  // Admin Management
  { code: 'admin.view', name: 'View Admins', group: 'Admin Management', description: 'View admin accounts' },
  { code: 'admin.create', name: 'Create Admin', group: 'Admin Management', description: 'Create admin account' },
  { code: 'admin.update', name: 'Update Admin', group: 'Admin Management', description: 'Update admin account' },
  { code: 'admin.delete', name: 'Delete Admin', group: 'Admin Management', description: 'Delete admin account' },
  { code: 'admin.assign_role', name: 'Assign Role', group: 'Admin Management', description: 'Assign role to admin' },

  // System
  { code: 'config.update', name: 'Update Config', group: 'System', description: 'Update system configuration' },
  { code: 'audit_logs.view', name: 'View Audit Logs', group: 'System', description: 'View audit logs' },
];

// ─── Role Definitions with Default Permissions ──────────────────────────

export interface RoleDef {
  slug: string;
  name: string;
  description: string;
  permissions: string[]; // permission codes
}

export const ROLES: RoleDef[] = [
  {
    slug: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full access to all platform features and settings',
    permissions: PERMISSIONS.map((p) => p.code), // ALL permissions
  },
  {
    slug: 'OPERATIONS_ADMIN',
    name: 'Operations Admin',
    description: 'Manages day-to-day operations including users, experts, sessions, and analytics',
    permissions: [
      'user.view', 'user.ban', 'user.unban', 'user.view_activity',
      'expert.view', 'expert.application_view', 'expert.approve', 'expert.reject',
      'expert.update_profile', 'expert.suspend', 'expert.activate',
      'expert.view_earnings', 'expert.view_sessions',
      'session.force_end',
      'chat.view', 'chat.view_flagged',
      'report.view', 'report.resolve',
      'analytics.view', 'analytics.revenue', 'analytics.traffic',
      'audit_logs.view',
    ],
  },
  {
    slug: 'EXPERT_ONBOARDING_ADMIN',
    name: 'Expert Onboarding Admin',
    description: 'Handles expert applications, verification, and onboarding process',
    permissions: [
      'expert.view', 'expert.application_view', 'expert.approve', 'expert.reject',
      'expert.update_profile', 'expert.view_sessions',
      'expert.verify_documents', 'expert.verify_aadhar',
      'expert.interview_schedule', 'expert.interview_complete',
    ],
  },
  {
    slug: 'MODERATION_ADMIN',
    name: 'Moderation Admin',
    description: 'Moderates content, reviews reports, and manages chat conversations',
    permissions: [
      'user.view', 'user.ban', 'user.unban', 'user.view_activity',
      'expert.view', 'expert.suspend', 'expert.activate',
      'session.force_end',
      'chat.view', 'chat.view_flagged', 'chat.delete_message',
      'report.view', 'report.resolve',
    ],
  },
  {
    slug: 'FINANCE_ADMIN',
    name: 'Finance Admin',
    description: 'Manages financial operations including transactions, payouts, and revenue',
    permissions: [
      'transaction.view', 'transaction.export', 'transaction.refund',
      'payout.view', 'payout.approve', 'payout.reject', 'payout.release',
      'analytics.view', 'analytics.revenue',
      'expert.view_earnings',
    ],
  },
  {
    slug: 'SUPPORT_ADMIN',
    name: 'Support Admin',
    description: 'Handles customer support including user issues, reports, and basic moderation',
    permissions: [
      'user.view', 'user.view_activity',
      'expert.view', 'expert.view_sessions',
      'chat.view', 'chat.view_flagged',
      'report.view', 'report.resolve',
      'transaction.view',
      'payout.view',
    ],
  },
];

/**
 * Helper to get all permission codes as a flat array.
 */
export const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

/**
 * Get permissions grouped by their group name.
 */
export function getPermissionsByGroup(): Record<string, PermissionDef[]> {
  const groups: Record<string, PermissionDef[]> = {};
  for (const perm of PERMISSIONS) {
    if (!groups[perm.group]) groups[perm.group] = [];
    groups[perm.group].push(perm);
  }
  return groups;
}
