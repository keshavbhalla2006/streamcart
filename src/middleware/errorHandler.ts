import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
}

export const errorHandler = (
  err:  AppError,
  req:  Request,
  res:  Response,
  next: NextFunction  // must be declared even if unused — Express needs 4 params
): void => {
  console.error(err.stack);

  const status  = err.status  || 500;
  const message = err.message || 'Something went wrong';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};