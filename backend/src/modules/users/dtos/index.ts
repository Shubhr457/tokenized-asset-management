import { body } from 'express-validator';

export const createUserValidation = [
  body('walletAddress').isEthereumAddress().withMessage('Invalid Ethereum address'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('phone').optional().isString()
];

export const verifyUserValidation = [
  body('status').isBoolean().withMessage('Status must be a boolean')
];

export const batchVerifyValidation = [
  body('users').isArray({ min: 1 }).withMessage('Users must be a non-empty array'),
  body('users.*').isEthereumAddress().withMessage('Invalid Ethereum address'),
  body('status').isBoolean().withMessage('Status must be a boolean')
];

