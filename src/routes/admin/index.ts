/**
 * Admin routes barrel — mounts all admin route modules under /admin prefix.
 * All routes require admin authentication and audit logging.
 * Rate limiting is applied at the router level.
 */
import { Router } from 'express';
import { authenticateAdmin, requirePermissions } from '../../middlewares/adminAuth';
import { auditLogger } from '../../middlewares/auditLogger';
import { adminRateLimiter, adminAuthRateLimiter, adminWriteRateLimiter } from '../../middlewares/adminRateLimiter';
import { asyncHandler } from '../../utils/asyncHandler';

// Controllers
import * as adminAuthController from '../../controllers/admin/adminAuthController';
import * as userMgmtController from '../../controllers/admin/userManagementController';
import * as expertMgmtController from '../../controllers/admin/expertManagementController';
import * as expertVerifController from '../../controllers/admin/expertVerificationController';
import * as sessionMgmtController from '../../controllers/admin/sessionManagementController';
import * as chatMgmtController from '../../controllers/admin/chatManagementController';
import * as moderationController from '../../controllers/admin/moderationController';
import * as transactionController from '../../controllers/admin/transactionController';
import * as payoutMgmtController from '../../controllers/admin/payoutManagementController';
import * as analyticsController from '../../controllers/admin/analyticsController';
import * as adminMgmtController from '../../controllers/admin/adminManagementController';
import * as systemController from '../../controllers/admin/systemController';

const router = Router();

// ─── Public admin routes (no auth required) ──────────────────────────
router.post('/auth/login', adminAuthRateLimiter, adminAuthController.login);
router.post('/auth/refresh-token', adminAuthRateLimiter, adminAuthController.refreshToken);

// ─── All subsequent routes require admin authentication ──────────────
router.use(asyncHandler(authenticateAdmin));
router.use(auditLogger);
router.use(adminRateLimiter);

// ─── Admin Auth (authenticated) ──────────────────────────────────────
router.get('/auth/profile', adminAuthController.getProfile);
router.put('/auth/change-password', adminAuthController.changePassword);

// ─── User Management ─────────────────────────────────────────────────
router.get('/users', requirePermissions('user.view'), userMgmtController.listUsers);
router.get('/users/:userId', requirePermissions('user.view'), userMgmtController.getUserById);
router.post('/users/:userId/ban', adminWriteRateLimiter, requirePermissions('user.ban'), userMgmtController.banUser);
router.post('/users/:userId/unban', adminWriteRateLimiter, requirePermissions('user.unban'), userMgmtController.unbanUser);
router.delete('/users/:userId', adminWriteRateLimiter, requirePermissions('user.delete'), userMgmtController.deleteUser);
router.get('/users/:userId/activity', requirePermissions('user.view_activity'), userMgmtController.getUserActivity);

// ─── Expert Management ───────────────────────────────────────────────
router.get('/experts', requirePermissions('expert.view'), expertMgmtController.listExperts);
router.get('/experts/:userId', requirePermissions('expert.view'), expertMgmtController.getExpertById);
router.post('/experts/:userId/approve', adminWriteRateLimiter, requirePermissions('expert.approve'), expertMgmtController.approveExpert);
router.post('/experts/:userId/reject', adminWriteRateLimiter, requirePermissions('expert.reject'), expertMgmtController.rejectExpert);
router.post('/experts/:userId/suspend', adminWriteRateLimiter, requirePermissions('expert.suspend'), expertMgmtController.suspendExpert);
router.post('/experts/:userId/activate', adminWriteRateLimiter, requirePermissions('expert.activate'), expertMgmtController.activateExpert);
router.delete('/experts/:userId', adminWriteRateLimiter, requirePermissions('expert.delete'), expertMgmtController.deleteExpert);
router.get('/experts/:userId/earnings', requirePermissions('expert.view_earnings'), expertMgmtController.getExpertEarnings);
router.get('/experts/:userId/sessions', requirePermissions('expert.view_sessions'), expertMgmtController.getExpertSessions);

// ─── Expert Profile Update Requests ──────────────────────────────────
router.get('/experts/profile-updates/pending', requirePermissions('expert.update_profile'), expertMgmtController.getPendingProfileUpdates);
router.post('/experts/profile-updates/:requestId/approve', adminWriteRateLimiter, requirePermissions('expert.update_profile'), expertMgmtController.approveProfileUpdate);
router.post('/experts/profile-updates/:requestId/reject', adminWriteRateLimiter, requirePermissions('expert.update_profile'), expertMgmtController.rejectProfileUpdate);

// ─── Expert Verification ─────────────────────────────────────────────
router.post('/experts/:userId/verify-documents', adminWriteRateLimiter, requirePermissions('expert.verify_documents'), expertVerifController.verifyDocuments);
router.post('/experts/:userId/verify-aadhar', adminWriteRateLimiter, requirePermissions('expert.verify_aadhar'), expertVerifController.verifyAadhar);
router.post('/experts/:userId/interview/schedule', adminWriteRateLimiter, requirePermissions('expert.interview_schedule'), expertVerifController.scheduleInterview);
router.post('/experts/:userId/interview/postpone', adminWriteRateLimiter, requirePermissions('expert.interview_schedule'), expertVerifController.postponeInterview);
router.post('/experts/:userId/interview/cancel', adminWriteRateLimiter, requirePermissions('expert.interview_schedule'), expertVerifController.cancelInterview);
router.post('/experts/:userId/interview/complete', adminWriteRateLimiter, requirePermissions('expert.interview_complete'), expertVerifController.completeInterview);

// ─── Session Management ──────────────────────────────────────────────
router.get('/sessions', requirePermissions('session.force_end'), sessionMgmtController.listSessions);
router.get('/sessions/:sessionId', requirePermissions('session.force_end'), sessionMgmtController.getSessionById);
router.post('/sessions/:sessionId/force-end', adminWriteRateLimiter, requirePermissions('session.force_end'), sessionMgmtController.forceEndSession);

// ─── Chat Management ─────────────────────────────────────────────────
router.get('/chats', requirePermissions('chat.view'), chatMgmtController.getChatMessages);
router.get('/chats/flagged', requirePermissions('chat.view_flagged'), chatMgmtController.getFlaggedMessages);
router.delete('/chats/:messageId', adminWriteRateLimiter, requirePermissions('chat.delete_message'), chatMgmtController.deleteMessage);

// ─── Moderation (Reports) ────────────────────────────────────────────
router.get('/reports', requirePermissions('report.view'), moderationController.listReports);
router.get('/reports/:reportId', requirePermissions('report.view'), moderationController.getReportById);
router.post('/reports/:reportId/resolve', adminWriteRateLimiter, requirePermissions('report.resolve'), moderationController.resolveReport);

// ─── Transactions ────────────────────────────────────────────────────
router.get('/transactions', requirePermissions('transaction.view'), transactionController.listTransactions);
router.get('/transactions/export', requirePermissions('transaction.export'), transactionController.exportTransactions);
router.get('/transactions/:transactionId', requirePermissions('transaction.view'), transactionController.getTransactionById);
router.post('/transactions/:transactionId/refund', adminWriteRateLimiter, requirePermissions('transaction.refund'), transactionController.processRefund);

// ─── Payouts ─────────────────────────────────────────────────────────
router.get('/payouts', requirePermissions('payout.view'), payoutMgmtController.listPayouts);
router.get('/payouts/:payoutId', requirePermissions('payout.view'), payoutMgmtController.getPayoutById);
router.post('/payouts/:payoutId/approve', adminWriteRateLimiter, requirePermissions('payout.approve'), payoutMgmtController.approvePayout);
router.post('/payouts/:payoutId/reject', adminWriteRateLimiter, requirePermissions('payout.reject'), payoutMgmtController.rejectPayout);
router.post('/payouts/:payoutId/release', adminWriteRateLimiter, requirePermissions('payout.release'), payoutMgmtController.releasePayout);

// ─── Analytics ───────────────────────────────────────────────────────
router.get('/analytics/dashboard', requirePermissions('analytics.view'), analyticsController.getDashboardStats);
router.get('/analytics/revenue', requirePermissions('analytics.revenue'), analyticsController.getRevenueAnalytics);
router.get('/analytics/traffic', requirePermissions('analytics.traffic'), analyticsController.getTrafficAnalytics);

// ─── Admin Management ────────────────────────────────────────────────
router.get('/admins', requirePermissions('admin.view'), adminMgmtController.listAdmins);
router.get('/admins/:adminId', requirePermissions('admin.view'), adminMgmtController.getAdminById);
router.post('/admins', adminWriteRateLimiter, requirePermissions('admin.create'), adminMgmtController.createAdmin);
router.put('/admins/:adminId', adminWriteRateLimiter, requirePermissions('admin.update'), adminMgmtController.updateAdmin);
router.delete('/admins/:adminId', adminWriteRateLimiter, requirePermissions('admin.delete'), adminMgmtController.deleteAdmin);
router.post('/admins/:adminId/assign-role', adminWriteRateLimiter, requirePermissions('admin.assign_role'), adminMgmtController.assignRole);

// ─── Roles & Permissions (read-only for non-super-admins) ────────────
router.get('/roles', requirePermissions('admin.view'), adminMgmtController.listRoles);
router.get('/roles/:roleId', requirePermissions('admin.view'), adminMgmtController.getRoleById);
router.get('/permissions', requirePermissions('admin.view'), adminMgmtController.listPermissions);

// ─── System ──────────────────────────────────────────────────────────
router.get('/system/config', requirePermissions('config.update'), systemController.listConfigs);
router.get('/system/config/:key', requirePermissions('config.update'), systemController.getConfig);
router.put('/system/config/:key', adminWriteRateLimiter, requirePermissions('config.update'), systemController.updateConfig);
router.get('/system/audit-logs', requirePermissions('audit_logs.view'), systemController.listAuditLogs);

export default router;
