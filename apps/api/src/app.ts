import * as Sentry from '@sentry/node';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestIdMiddleware } from './middleware/requestId';
import routes from './routes';
import { stripeWebhookHandler } from './controllers/webhookController';

export function createApp() {
  const app = express();

  // Request ID must be first for tracing
  app.use(requestIdMiddleware);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));

  // Stripe webhook needs raw body for signature verification - must be BEFORE express.json()
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // TODO: Remove after testing Sentry
  app.get('/debug-sentry', () => {
    throw new Error('Sentry test error - delete this route');
  });

  app.use('/api/v1', routes);

  // Sentry error handler must be before other error handlers
  Sentry.setupExpressErrorHandler(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
