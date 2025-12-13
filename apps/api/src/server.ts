import { env } from './config/env';
import { logger } from './lib/logger';
import { createApp } from './app';

const app = createApp();

app.listen(env.port, () => {
  logger.info(`API listening on http://localhost:${env.port}`);
});
