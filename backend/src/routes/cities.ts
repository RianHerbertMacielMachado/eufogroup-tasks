import { Router, Request, Response, NextFunction } from 'express';
import {
  getCities, getCityById, createCity, updateCity, deleteCity,
  uploadCityBackground, deleteCityBackground, getCityBackgrounds, getDashboard
} from '../controllers/cityController';
import { authenticate, requireAdmin, requireSuperAdmin, validateCityAccess } from '../middleware/auth';
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

// Rota pública (lista de cidades para tela inicial)
router.get('/', getCities);

router.use(authenticate);

// Acesso à cidade: qualquer usuário autenticado com acesso
router.get('/:cityId', validateCityAccess, getCityById);
router.get('/:cityId/dashboard', validateCityAccess, getDashboard);

// Gerenciamento de cidades e backgrounds: apenas SUPER_ADMIN
router.post('/',     requireSuperAdmin, createCity);
router.put('/:cityId', requireSuperAdmin, updateCity);
router.delete('/:cityId', requireSuperAdmin, deleteCity);
router.get('/:cityId/backgrounds',           requireSuperAdmin, getCityBackgrounds);
router.post('/:cityId/backgrounds',          requireSuperAdmin, uploadImages, uploadCityBackground);
router.delete('/:cityId/backgrounds/:bgId',  requireSuperAdmin, deleteCityBackground);

export default router;
