import { Router, Request, Response, NextFunction } from 'express';
import {
  getEvents, createEvent, updateEvent, deleteEvent, getEventFilterOptions
} from '../controllers/eventController';
import { authenticate, validateCityAccess, requireAdmin } from '../middleware/auth';
import memoryUpload from '../utils/memoryUpload';

const router = Router({ mergeParams: true });

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

router.use(authenticate, validateCityAccess);

// Leitura: todos
router.get('/filter-options', getEventFilterOptions);
router.get('/', getEvents);

// Escrita: ADMIN e SUPER_ADMIN apenas
router.post('/',           requireAdmin, uploadImages, createEvent);
router.put('/:eventId',    requireAdmin, uploadImages, updateEvent);
router.delete('/:eventId', requireAdmin, deleteEvent);

export default router;
