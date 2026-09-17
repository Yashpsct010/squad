import { Router } from 'express';
import { getPersonalCoachAdvice } from '../controllers/insightController';

const router = Router();

router.post('/personal-coach', getPersonalCoachAdvice);

export default router;
