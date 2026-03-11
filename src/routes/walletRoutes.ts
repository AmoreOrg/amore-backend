/**
 * Wallet routes — balance, Razorpay payments, earnings, and transaction history.
 */
import { Router } from 'express';
import * as walletCtrl from '../controllers/walletController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.get('/balance', authenticate, walletCtrl.getBalance);
router.post('/create-order', authenticate, walletCtrl.createOrder);
router.post('/verify-payment', authenticate, walletCtrl.verifyPayment);
router.get('/transactions', authenticate, walletCtrl.getTransactions);
router.post('/check-balance', authenticate, walletCtrl.checkBalance);
router.get('/earnings', authenticate, authorize('caller'), walletCtrl.getEarningsBreakdown);

export default router;
