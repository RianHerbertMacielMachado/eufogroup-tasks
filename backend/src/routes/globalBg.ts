import { Router, Request, Response, NextFunction } from 'express';
import { getGlobalBackgrounds, uploadGlobalBackgrounds, deleteGlobalBackground } from '../controllers/globalBgController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import memoryUpload from '../utils/memoryUpload';

const router = Router();

function uploadImages(req: Request, res: Response, next: NextFunction) {
  memoryUpload.array('images', 10)(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Arquivo muito grande. Tamanho máximo: 20MB por imagem.'
        : err.message || 'Erro ao processar arquivo';
      res.status(400).json({ success: false, error: msg });
      return;
    }
    next();
  });
}

// Rota pública (backgrounds de login/seleção de cidade)
router.get('/', getGlobalBackgrounds);

// Gerenciamento: apenas SUPER_ADMIN
router.use(authenticate, requireSuperAdmin);
router.post('/', uploadImages, uploadGlobalBackgrounds);
router.delete('/:bgId', deleteGlobalBackground);

export default router;
