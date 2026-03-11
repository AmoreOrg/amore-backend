/**
 * Review routes — submit and retrieve call reviews.
 */
import { Router } from 'express';
import * as reviewCtrl from '../controllers/reviewController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, reviewCtrl.submitReview);
router.get('/caller/:callerId', authenticate, reviewCtrl.getCallerReviews);

export default router;
