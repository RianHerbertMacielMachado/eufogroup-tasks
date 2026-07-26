import { Router } from 'express';
import { getTasks, getTaskById, createTask, updateTask, deleteTask } from '../controllers/taskController';
import { authenticate, validateCityAccess, requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate, validateCityAccess);

router.get('/', getTasks);
router.get('/:taskId', getTaskById);
router.post('/', createTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', requireAdmin, deleteTask);

export default router;
