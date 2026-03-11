/**
 * Database connection helper — connects to MongoDB with connection caching
 * for serverless (Lambda) environments.
 */
import mongoose from 'mongoose';
import { config } from '../config';
import logger from '../utils/logger';

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  // Reuse existing connection on Lambda warm starts
  if (isConnected && mongoose.connection.readyState === 1) {
    logger.info('Reusing existing MongoDB connection');
    return;
  }

  try {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    logger.info('MongoDB connected successfully');
  } catch (error) {
    isConnected = false;
    logger.error('MongoDB connection failed', error);
    throw error;
  }

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });
};
