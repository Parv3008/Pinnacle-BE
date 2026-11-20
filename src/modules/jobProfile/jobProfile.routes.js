import { Router } from 'express';
import { jobProfileController } from './jobProfile.controller.js';
import {
  createJobProfileSchema,
  updateJobProfileSchema,
  jobProfileIdSchema,
  jobProfileStatusSchema,
  jobProfileQuerySchema,
} from './jobProfile.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createJobProfileSchema), jobProfileController.create);
router.get('/', validate(jobProfileQuerySchema), jobProfileController.list);
router.get('/:id', validate(jobProfileIdSchema), jobProfileController.getById);
router.patch('/:id', validate(updateJobProfileSchema), jobProfileController.update);
router.patch('/:id/status', validate(jobProfileStatusSchema), jobProfileController.updateStatus);
router.delete('/:id', validate(jobProfileIdSchema), jobProfileController.archive);

export default router;
