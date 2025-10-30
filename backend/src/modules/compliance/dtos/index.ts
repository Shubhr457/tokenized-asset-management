import { body } from 'express-validator';

export const updateComplianceValidation = [
  body('status').isBoolean().withMessage('Status must be a boolean')
];

export const updateAssetStatusValidation = [
  body('status').isIn(['Pending', 'Active', 'Frozen', 'Delisted']).withMessage('Invalid status')
];

