/**
 * Auth routes — public and protected authentication endpoints.
 */
import { Router } from 'express';
import * as authCtrl from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/register', authCtrl.register);
router.post('/verify-otp', authCtrl.verifyOtp);
router.post('/resend-otp', authCtrl.resendOtp);
router.post('/login', authCtrl.login);
router.post('/refresh-token', authCtrl.refreshToken);
router.get('/profile', authenticate, authCtrl.getProfile);
router.put('/profile', authenticate, authCtrl.updateProfile);
router.put('/fcm-token', authenticate, authCtrl.updateFcmToken);

export default router;
