/**
 * Notification routes — retrieve and manage push notifications.
 */
import { Router } from 'express';
import * as notifCtrl from '../controllers/notificationController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, notifCtrl.getNotifications);
router.put('/:id/read', authenticate, notifCtrl.markAsRead);
router.put('/read-all', authenticate, notifCtrl.markAllAsRead);

export default router;
