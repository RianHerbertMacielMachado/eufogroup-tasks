import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../controllers/userController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Gerenciamento de usuários: apenas SUPER_ADMIN
router.use(authenticate, requireSuperAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:userId', updateUser);
router.delete('/:userId', deleteUser);
router.post('/:userId/reset-password', resetUserPassword);

export default router;
