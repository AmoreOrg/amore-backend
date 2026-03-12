/**
 * Server entry point — boots MongoDB, Redis, Express, WebSocket, and billing worker.
 */
import http from 'http';
import app from './app';
import { config } from './config';
import { connectDatabase } from './config/database';
import { redis } from './config/redis';
import { initWebSocket } from './websocket/socketServer';
import { startBillingWorker } from './workers/billingWorker';
import logger from './utils/logger';

async function bootstrap() {
  // 1. Connect to MongoDB
  await connectDatabase();

  // 2. Verify Redis connection
  try {
    await redis.connect();
    await redis.ping();
    logger.info('Redis ping successful');
  } catch (err) {
    logger.warn('Redis not available — billing worker and queues will be disabled');
  }

  // 3. Create HTTP server and attach Express
  const httpServer = http.createServer(app);

  // 4. Initialize WebSocket server
  initWebSocket(httpServer);

  // 5. Start billing worker (only if Redis is connected)
  try {
    await startBillingWorker();
  } catch (err) {
    logger.warn('Billing worker failed to start:', err);
  }

  // 6. Start listening
  httpServer.listen(config.port, () => {
    logger.info(`🚀 AMORE Backend running on port ${config.port} [${config.env}]`);
    logger.info(`   API:       http://localhost:${config.port}/api/v1`);
    logger.info(`   WebSocket: ws://localhost:${config.port}`);
    logger.info(`   Health:    http://localhost:${config.port}/api/v1/health`);
  });

  // ─── Graceful shutdown ──────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
