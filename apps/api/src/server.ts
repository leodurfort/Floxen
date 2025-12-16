// Railway deployment trigger
import { env } from './config/env';
import { logger } from './lib/logger';
import { createApp } from './app';
import { cronScheduler } from './services/cronScheduler';
import './workers';

const app = createApp();

// Start cron scheduler if enabled
if (env.scheduler.enableScheduledSync) {
  cronScheduler.start();
  logger.info('Cron scheduler started (scheduled sync enabled)');
} else {
  logger.info('Scheduled sync disabled (set ENABLE_SCHEDULED_SYNC=true to enable)');
}

app.listen(env.port, () => {
  logger.info(`API listening on http://localhost:${env.port}`);
  logger.info(`CORS origin: ${env.corsOrigin}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cronScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  cronScheduler.stop();
  process.exit(0);
});
