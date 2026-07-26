import { Router } from 'express';
import {
  getCities, getCityById, createCity, updateCity, deleteCity,
  uploadCityBackground, deleteCityBackground, getCityBackgrounds, getDashboard
} from '../controllers/cityController';
import { authenticate, requireAdmin, requireSuperAdmin, validateCityAccess } from '../middleware/auth';
import memoryUpload from '../utils/memoryUpload';

const router = Router();

// Rotas públicas (lista de cidades para tela inicial)
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
router.post('/:cityId/backgrounds', requireAdmin, memoryUpload.array('images', 10), uploadCityBackground);
router.delete('/:cityId/backgrounds/:bgId', requireAdmin, deleteCityBackground);

export default router;
