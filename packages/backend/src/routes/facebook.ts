import { Router } from 'express';
import { FacebookController } from '../controllers/FacebookController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/connect', authenticate, FacebookController.connectAccount);
router.get('/accounts', authenticate, FacebookController.getAccounts);
router.post('/:accountId/sync', authenticate, FacebookController.syncAccount);
router.get('/:accountId/monetization', authenticate, FacebookController.getMonetizationStatus);
router.put('/:accountId/page', authenticate, FacebookController.updatePageInfo);

export default router;
