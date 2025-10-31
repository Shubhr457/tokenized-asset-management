import Joi from 'joi';

// Custom Joi validator for Ethereum addresses
const ethereumAddress = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).messages({
  'string.pattern.base': 'Invalid Ethereum address'
});

export const createUserSchema = Joi.object({
  walletAddress: ethereumAddress.required(),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email address'
  }),
  firstName: Joi.string().required().messages({
    'string.empty': 'First name is required',
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().required().messages({
    'string.empty': 'Last name is required',
    'any.required': 'Last name is required'
  }),
  phone: Joi.string().optional()
});

export const verifyUserSchema = Joi.object({
  status: Joi.boolean().required().messages({
    'boolean.base': 'Status must be a boolean',
    'any.required': 'Status is required'
  })
});

export const batchVerifySchema = Joi.object({
  users: Joi.array().items(ethereumAddress).min(1).required().messages({
    'array.min': 'Users must be a non-empty array',
    'any.required': 'Users array is required'
  }),
  status: Joi.boolean().required().messages({
    'boolean.base': 'Status must be a boolean',
    'any.required': 'Status is required'
  })
});

