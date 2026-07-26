import { Router } from 'express';
import {
  getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee
} from '../controllers/employeeController';
import { authenticate, validateCityAccess } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate, validateCityAccess);

router.get('/', getEmployees);
router.get('/:employeeId', getEmployeeById);
router.post('/', createEmployee);
router.put('/:employeeId', updateEmployee);
router.delete('/:employeeId', deleteEmployee);

export default router;
