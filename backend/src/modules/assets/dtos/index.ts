import { body } from 'express-validator';
import { IRegisterAssetRequest } from '../../../interfaces';

export const registerAssetValidation = [
  body('to').isEthereumAddress().withMessage('Invalid Ethereum address'),
  body('metadataURI').notEmpty().withMessage('Metadata URI is required'),
  body('assetType').isIn(['property', 'share', 'collectible', 'document', 'other']).withMessage('Invalid asset type'),
  body('valuation').isFloat({ min: 0 }).withMessage('Valuation must be a positive number'),
  body('name').notEmpty().withMessage('Asset name is required'),
  body('description').optional().isString()
];

export const getAssetValidation = [
  // Will be handled by route param validation
];

export const getAssetsByOwnerValidation = [
  // Will be handled by route param validation
];

export const getTransferHistoryValidation = [
  // Will be handled by route param validation
];

