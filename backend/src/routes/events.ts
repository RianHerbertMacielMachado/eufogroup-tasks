import { Router } from 'express';
import { getEvents, createEvent, deleteEvent } from '../controllers/eventController';
import { authenticate, validateCityAccess, requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate, validateCityAccess);

router.get('/', getEvents);
router.post('/', createEvent);
router.delete('/:eventId', requireAdmin, deleteEvent);

export default router;
