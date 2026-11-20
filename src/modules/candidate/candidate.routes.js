import { Router } from 'express';
import { candidateController } from './candidate.controller.js';
import {
  createCandidateSchema,
  updateCandidateSchema,
  candidateIdSchema,
  candidateAvailabilitySchema,
  candidateQuerySchema,
} from './candidate.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createCandidateSchema), candidateController.create);
router.get('/', validate(candidateQuerySchema), candidateController.list);
router.get('/export/csv', validate(candidateQuerySchema), candidateController.exportCsv);
router.get('/:id', validate(candidateIdSchema), candidateController.getById);
router.patch('/:id', validate(updateCandidateSchema), candidateController.update);
router.patch(
  '/:id/availability',
  validate(candidateAvailabilitySchema),
  candidateController.updateAvailability
);
router.delete('/:id', validate(candidateIdSchema), candidateController.archive);

export default router;
