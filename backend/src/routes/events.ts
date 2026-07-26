import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventFilterOptions
} from '../controllers/eventController';
import { authenticate, validateCityAccess, requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

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
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB (suporta GIFs animados)
});

router.use(authenticate, validateCityAccess);

// GET /cities/:cityId/events/filter-options — opções para os filtros de cargo/funcao
router.get('/filter-options', getEventFilterOptions);

// GET /cities/:cityId/events?cargo=&funcao=&employeeId=&page=&limit=
router.get('/', getEvents);

// POST /cities/:cityId/events — multipart/form-data com imagens opcionais
router.post('/', upload.array('images', 10), createEvent);

// PUT /cities/:cityId/events/:eventId — editar descrição, link, imagens
router.put('/:eventId', upload.array('images', 10), updateEvent);

// DELETE /cities/:cityId/events/:eventId — admin only
router.delete('/:eventId', requireAdmin, deleteEvent);

export default router;
