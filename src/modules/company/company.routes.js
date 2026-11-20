import { Router } from 'express';
import { companyController } from './company.controller.js';
import {
  createCompanySchema,
  updateCompanySchema,
  companyIdSchema,
  companyStatusSchema,
  companyQuerySchema,
} from './company.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createCompanySchema), companyController.create);
router.get('/', validate(companyQuerySchema), companyController.list);
router.get('/:id', validate(companyIdSchema), companyController.getById);
router.patch('/:id', validate(updateCompanySchema), companyController.update);
router.patch('/:id/status', validate(companyStatusSchema), companyController.updateStatus);
router.delete('/:id', validate(companyIdSchema), companyController.archive);

export default router;
