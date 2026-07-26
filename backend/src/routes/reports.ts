import { Router } from 'express';
import { getReport } from '../controllers/reportController';
import { authenticate, validateCityAccess } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate, validateCityAccess);

// GET /cities/:cityId/reports?employeeId=&cargo=&month=&year=
router.get('/', getReport);

export default router;
