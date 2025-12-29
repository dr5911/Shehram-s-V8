import { Router } from 'express';
import authRoutes from './auth';
import facebookRoutes from './facebook';
import earningsRoutes from './earnings';
import autopilotRoutes from './autopilot';

const router = Router();

router.use('/auth', authRoutes);
router.use('/facebook', facebookRoutes);
router.use('/earnings', earningsRoutes);
router.use('/autopilot', autopilotRoutes);

export default router;
