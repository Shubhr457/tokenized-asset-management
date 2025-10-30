import { Router } from 'express';
import { param } from 'express-validator';
import * as controllers from '../controllers';
import { validate } from '../../../middlewares';
import {
  updateComplianceValidation,
  updateAssetStatusValidation
} from '../dtos';

const router = Router();

router.post('/assets/:assetId/compliance', [
  param('assetId').isInt({ min: 0 }).withMessage('Invalid asset ID')
], validate(updateComplianceValidation), controllers.setCompliance);

router.post('/assets/:assetId/status', [
  param('assetId').isInt({ min: 0 }).withMessage('Invalid asset ID')
], validate(updateAssetStatusValidation), controllers.setAssetStatus);

export default router;

