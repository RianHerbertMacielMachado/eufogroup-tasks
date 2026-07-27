import { Router } from 'express';
import { getTasks, getTaskById, createTask, updateTask, deleteTask } from '../controllers/taskController';
import { authenticate, validateCityAccess, requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate, validateCityAccess);

// Leitura: OPERATOR, ADMIN e SUPER_ADMIN
router.get('/', getTasks);
router.get('/:taskId', getTaskById);

// Escrita: ADMIN e SUPER_ADMIN apenas
router.post('/',         requireAdmin, createTask);
router.put('/:taskId',   requireAdmin, updateTask);
router.delete('/:taskId', requireAdmin, deleteTask);

export default router;
