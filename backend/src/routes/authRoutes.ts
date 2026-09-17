import { Router } from 'express';
import { registerOrLogin, getUserProfile } from '../controllers/authController';

const router = Router();

router.post('/login', registerOrLogin);
router.get('/profile/:userId', getUserProfile);

export default router;
