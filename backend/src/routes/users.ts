import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../controllers/userController';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:userId', updateUser);
router.delete('/:userId', requireSuperAdmin, deleteUser);
router.post('/:userId/reset-password', resetUserPassword);

export default router;
