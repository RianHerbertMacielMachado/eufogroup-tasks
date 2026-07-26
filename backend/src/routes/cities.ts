import { Router, Request, Response, NextFunction } from 'express';
import {
  getCities, getCityById, createCity, updateCity, deleteCity,
  uploadCityBackground, deleteCityBackground, getCityBackgrounds, getDashboard
} from '../controllers/cityController';
import { authenticate, requireAdmin, requireSuperAdmin, validateCityAccess } from '../middleware/auth';
import memoryUpload from '../utils/memoryUpload';

const router = Router();

// Multer com tratamento de erro de tamanho
function uploadImages(req: Request, res: Response, next: NextFunction) {
  memoryUpload.array('images', 10)(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Arquivo muito grande. Tamanho máximo: 8MB por imagem.'
        : err.message || 'Erro ao processar arquivo';
      res.status(400).json({ success: false, error: msg });
      return;
    }
    next();
  });
}

// Rotas públicas
router.get('/', getCities);

// Rotas protegidas
router.use(authenticate);

router.get('/:cityId', validateCityAccess, getCityById);
router.get('/:cityId/dashboard', validateCityAccess, getDashboard);

// Admin only
router.post('/', requireAdmin, createCity);
router.put('/:cityId', requireAdmin, updateCity);
router.delete('/:cityId', requireSuperAdmin, deleteCity);
router.get('/:cityId/backgrounds', requireAdmin, getCityBackgrounds);
router.post('/:cityId/backgrounds', requireAdmin, uploadImages, uploadCityBackground);
router.delete('/:cityId/backgrounds/:bgId', requireAdmin, deleteCityBackground);

export default router;
