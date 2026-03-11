/**
 * Payout routes — caller withdrawals and admin management.
 */
import { Router } from 'express';
import * as payoutCtrl from '../controllers/payoutController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Caller routes
router.post('/request', authenticate, authorize('caller'), payoutCtrl.requestPayout);
router.get('/history', authenticate, authorize('caller'), payoutCtrl.getPayoutHistory);

// Admin routes
router.get('/pending', authenticate, authorize('admin'), payoutCtrl.getPendingPayouts);
router.put('/:payoutId/process', authenticate, authorize('admin'), payoutCtrl.processPayout);

export default router;
