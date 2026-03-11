/**
 * Caller routes — CRUD, search, and profile update requests.
 */
import { Router } from 'express';
import * as callerCtrl from '../controllers/callerController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Public — search callers
router.get('/search', authenticate, callerCtrl.searchCallers);

// Caller-only routes (before /:id so they don't get caught by the param route)
router.post('/profile', authenticate, authorize('caller'), callerCtrl.createProfile);
router.put('/profile', authenticate, authorize('caller'), callerCtrl.updateProfile);
router.get('/me/profile', authenticate, authorize('caller'), callerCtrl.getMyProfile);
router.put('/online-status', authenticate, authorize('caller'), callerCtrl.toggleOnline);

// Profile update requests (caller submits, admin reviews)
router.post('/update-request', authenticate, authorize('caller'), callerCtrl.submitProfileUpdateRequest);
router.get('/update-requests/mine', authenticate, authorize('caller'), callerCtrl.getMyUpdateRequests);
router.get('/update-requests/pending', authenticate, authorize('admin'), callerCtrl.getPendingUpdateRequests);
router.post('/update-requests/:requestId/approve', authenticate, authorize('admin'), callerCtrl.approveUpdateRequest);
router.post('/update-requests/:requestId/reject', authenticate, authorize('admin'), callerCtrl.rejectUpdateRequest);

// Param route last
router.get('/:id', authenticate, callerCtrl.getProfileById);

export default router;
