import { Router } from 'express';
import { param } from 'express-validator';
import * as controllers from '../controllers';
import { validate } from '../../../middlewares';
import {
  registerAssetValidation,
  getAssetValidation,
  getAssetsByOwnerValidation,
  getTransferHistoryValidation
} from '../dtos';

const router = Router();

router.get('/', controllers.getAllAssets);

router.get('/:assetId', [
  param('assetId').isInt({ min: 0 }).withMessage('Invalid asset ID')
], validate([]), controllers.getAssetById);

router.post('/register', validate(registerAssetValidation), controllers.registerAsset);

router.get('/owner/:address', [
  param('address').isEthereumAddress().withMessage('Invalid Ethereum address')
], validate([]), controllers.getAssetsByOwner);

router.get('/:assetId/transfers', [
  param('assetId').isInt({ min: 0 }).withMessage('Invalid asset ID')
], validate([]), controllers.getTransferHistory);

export default router;

