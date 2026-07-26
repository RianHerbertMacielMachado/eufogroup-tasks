import { Router } from 'express';
import { login, refreshToken, changePassword, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/change-password', authenticate, changePassword);
router.get('/me', authenticate, getMe);

export default router;
