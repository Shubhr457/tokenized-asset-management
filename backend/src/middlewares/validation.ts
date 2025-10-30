import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { IApiResponse } from '../interfaces';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (validations.length > 0) {
      await Promise.all(validations.map(validation => validation.run(req)));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: IApiResponse<null> = {
        success: false,
        errors: errors.array()
      };
      res.status(400).json(response);
      return;
    }

    next();
  };
};

