import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/overview', dashboardController.overview);
router.get('/hiring-stats', dashboardController.hiringStats);
router.get('/trade-stats', dashboardController.tradeStats);
router.get('/recent-activities', dashboardController.recentActivities);

export default router;
