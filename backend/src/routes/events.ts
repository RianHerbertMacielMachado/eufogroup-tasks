import { Router } from 'express';
import {
  getEvents, createEvent, updateEvent, deleteEvent, getEventFilterOptions
} from '../controllers/eventController';
import { authenticate, validateCityAccess, requireAdmin } from '../middleware/auth';
import memoryUpload from '../utils/memoryUpload';

const router = Router({ mergeParams: true });

router.use(authenticate, validateCityAccess);

router.get('/filter-options', getEventFilterOptions);
router.get('/', getEvents);
router.post('/', memoryUpload.array('images', 10), createEvent);
router.put('/:eventId', memoryUpload.array('images', 10), updateEvent);
router.delete('/:eventId', requireAdmin, deleteEvent);

export default router;
