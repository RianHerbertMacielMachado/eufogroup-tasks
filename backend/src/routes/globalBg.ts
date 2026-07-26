import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getGlobalBackgrounds, uploadGlobalBackgrounds, deleteGlobalBackground } from '../controllers/globalBgController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `global_${uuidv4()}${ext}`);
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
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB (suporta GIFs animados)
});

// Rota pública: frontend busca backgrounds sem autenticação
router.get('/', getGlobalBackgrounds);

// Rotas admin
router.use(authenticate);
router.post('/', requireAdmin, upload.array('images', 10), uploadGlobalBackgrounds);
router.delete('/:bgId', requireAdmin, deleteGlobalBackground);

export default router;
