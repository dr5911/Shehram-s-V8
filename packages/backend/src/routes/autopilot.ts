import { Router } from 'express';
import { AutopilotController } from '../controllers/AutopilotController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/settings/:accountId', authenticate, AutopilotController.getSettings);
router.put('/settings/:accountId', authenticate, AutopilotController.updateSettings);
router.post('/trends/research', authenticate, AutopilotController.researchTrends);
router.get('/trends', authenticate, AutopilotController.getTrends);
router.post('/content/generate', authenticate, AutopilotController.generateContent);
router.post('/content/predict', authenticate, AutopilotController.predictPerformance);
router.post('/hashtags/generate', authenticate, AutopilotController.generateHashtags);
router.post('/schedule/:accountId', authenticate, AutopilotController.scheduleAutoPosts);
router.get('/scheduled', authenticate, AutopilotController.getScheduledPosts);
router.post('/scheduled', authenticate, AutopilotController.createScheduledPost);
router.delete('/scheduled/:postId', authenticate, AutopilotController.cancelScheduledPost);
router.get('/optimal-times/:accountId', authenticate, AutopilotController.getOptimalPostingTimes);

export default router;
