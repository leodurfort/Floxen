import * as Sentry from '@sentry/node';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JwtUser } from './auth';

interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  stack?: string;
  requestId?: string;
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Extract request context for logging
  const requestContext = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    userId: (req as Request & { user?: JwtUser }).user?.sub,
    ip: req.ip,
  };

  // Determine error type and appropriate response
  let statusCode = 500;
  let errorResponse: ErrorResponse = {
    error: 'Internal server error',
  };

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    errorResponse = {
      error: 'Validation error',
      message: 'Invalid request data',
      details: err.flatten(),
    };
    logger.warn('Validation error', {
      error: err,
      ...requestContext,
      validationErrors: err.flatten(),
    });
  }
  // Handle Prisma errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    if (err.code === 'P2002') {
      errorResponse = {
        error: 'Unique constraint violation',
        message: 'A record with this value already exists',
      };
    } else if (err.code === 'P2025') {
      statusCode = 404;
      errorResponse = {
        error: 'Record not found',
        message: 'The requested resource does not exist',
      };
    } else {
      errorResponse = {
        error: 'Database error',
        message: err.message,
      };
    }
    logger.error('Database error', {
      error: err,
      ...requestContext,
      prismaCode: err.code,
    });
  }
  // Handle custom API errors with status codes
  else if ('statusCode' in err && typeof (err as any).statusCode === 'number') {
    statusCode = (err as any).statusCode;
    errorResponse = {
      error: err.name || 'Error',
      message: err.message,
    };
    logger.error('API error', {
      error: err,
      ...requestContext,
      statusCode,
    });
  }
  // Handle all other errors
  else {
    errorResponse = {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    };
    logger.error('Unhandled error', {
      error: err,
      ...requestContext,
    });
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Include request ID so users can reference it when reporting issues
  errorResponse.requestId = req.requestId;

  // Capture error in Sentry (skip 4xx client errors)
  if (statusCode >= 500) {
    Sentry.withScope((scope) => {
      scope.setTag('requestId', req.requestId || 'unknown');
      scope.setExtra('requestContext', requestContext);
      if (requestContext.userId) {
        scope.setUser({ id: requestContext.userId });
      }
      Sentry.captureException(err);
    });
  }

  res.status(statusCode).json(errorResponse);
}
