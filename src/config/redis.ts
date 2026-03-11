/**
 * Redis client — shared IORedis instance for caching, pub/sub, and BullMQ.
 */
import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null, // required by BullMQ
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));
