import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  getCities, getCityById, createCity, updateCity, deleteCity,
  uploadCityBackground, getDashboard
} from '../controllers/cityController';
import { authenticate, requireAdmin, requireSuperAdmin, validateCityAccess } from '../middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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
router.post('/:cityId/backgrounds', requireAdmin, upload.array('images', 10), uploadCityBackground);

export default router;
