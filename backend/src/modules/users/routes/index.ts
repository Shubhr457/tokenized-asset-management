import { Router } from 'express';
import { param } from 'express-validator';
import * as controllers from '../controllers';
import { validate } from '../../../middlewares';
import {
  createUserValidation,
  verifyUserValidation,
  batchVerifyValidation
} from '../dtos';

const router = Router();

router.get('/', controllers.getAllUsers);

router.get('/:address', [
  param('address').isEthereumAddress().withMessage('Invalid Ethereum address')
], validate([]), controllers.getUserByAddress);

router.post('/', validate(createUserValidation), controllers.createUser);

router.post('/:address/verify', [
  param('address').isEthereumAddress().withMessage('Invalid Ethereum address')
], validate(verifyUserValidation), controllers.verifyUser);

router.post('/batch-verify', validate(batchVerifyValidation), controllers.batchVerifyUsers);

export default router;

