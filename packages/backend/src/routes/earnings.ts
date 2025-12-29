import { Router } from 'express';
import { EarningsController } from '../controllers/EarningsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, EarningsController.getEarnings);
router.get('/summary', authenticate, EarningsController.getEarningsSummary);
router.get('/content/:contentId', authenticate, EarningsController.getEarningsByContent);
router.post('/', authenticate, EarningsController.createEarning);

export default router;
