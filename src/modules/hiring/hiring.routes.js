import { Router } from 'express';
import { hiringController } from './hiring.controller.js';
import {
  createHiringSchema,
  updateHiringSchema,
  hiringIdSchema,
  hiringStatusSchema,
  hiringJoiningSchema,
  hiringQuerySchema,
} from './hiring.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createHiringSchema), hiringController.create);
router.get('/', validate(hiringQuerySchema), hiringController.list);
router.get('/:id', validate(hiringIdSchema), hiringController.getById);
router.patch('/:id', validate(updateHiringSchema), hiringController.update);
router.patch('/:id/status', validate(hiringStatusSchema), hiringController.updateStatus);
router.patch('/:id/joining', validate(hiringJoiningSchema), hiringController.updateJoining);
router.delete('/:id', validate(hiringIdSchema), hiringController.remove);

export default router;
