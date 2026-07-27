import { Router } from 'express';
import { getGlobalBackgrounds, uploadGlobalBackgrounds, deleteGlobalBackground } from '../controllers/globalBgController';
import { authenticate, requireAdmin } from '../middleware/auth';
import memoryUpload from '../utils/memoryUpload';

const router = Router();

// Rota pública
router.get('/', getGlobalBackgrounds);

// Rotas admin
router.use(authenticate);
router.post('/', requireAdmin, memoryUpload.array('images', 10), uploadGlobalBackgrounds);
router.delete('/:bgId', requireAdmin, deleteGlobalBackground);

export default router;
