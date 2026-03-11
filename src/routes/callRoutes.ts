/**
 * Call routes — initiate, accept/reject, end, history, and recent contacts.
 */
import { Router } from 'express';
import * as callCtrl from '../controllers/callController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.post('/initiate', authenticate, callCtrl.initiateCall);
router.post('/:callId/accept', authenticate, callCtrl.acceptCall);
router.post('/:callId/reject', authenticate, callCtrl.rejectCall);
router.post('/:callId/end', authenticate, callCtrl.endCall);
router.get('/history', authenticate, callCtrl.getCallHistory);
router.get('/recent-contacts', authenticate, authorize('caller'), callCtrl.getRecentContacts);
router.get('/:callId', authenticate, callCtrl.getCallSession);

export default router;
