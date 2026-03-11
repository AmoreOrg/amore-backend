/**
 * Route barrel — mounts all route modules under their API prefix.
 */
import { Router } from 'express';
import authRoutes from './authRoutes';
import callerRoutes from './callerRoutes';
import walletRoutes from './walletRoutes';
import callRoutes from './callRoutes';
import payoutRoutes from './payoutRoutes';
import reviewRoutes from './reviewRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/callers', callerRoutes);
router.use('/wallet', walletRoutes);
router.use('/calls', callRoutes);
router.use('/payouts', payoutRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
