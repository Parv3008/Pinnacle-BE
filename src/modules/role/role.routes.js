import { Router } from 'express';
import { roleController } from './role.controller.js';
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdSchema,
  roleStatusSchema,
  roleQuerySchema,
} from './role.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createRoleSchema), roleController.create);
router.get('/', validate(roleQuerySchema), roleController.list);
router.get('/:id', validate(roleIdSchema), roleController.getById);
router.patch('/:id', validate(updateRoleSchema), roleController.update);
router.patch('/:id/status', validate(roleStatusSchema), roleController.updateStatus);
router.delete('/:id', validate(roleIdSchema), roleController.archive);

export default router;
