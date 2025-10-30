import { Request, Response, NextFunction } from 'express';
import logger from '../helpers/logger';
import { env } from '../environments';
import { IApiResponse } from '../interfaces';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error:', err);
  
  const response: IApiResponse<null> = {
    success: false,
    message: err.message || 'Internal server error',
  };

  if (env.NODE_ENV === 'development' && err.stack) {
    (response as any).stack = err.stack;
  }

  res.status(err.status || 500).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: IApiResponse<null> = {
    success: false,
    message: 'Route not found'
  };
  res.status(404).json(response);
};

