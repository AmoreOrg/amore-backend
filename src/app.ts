/**
 * Express App — configures middleware, routes, and error handling.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { connectDatabase } from './config/database';

const app = express();

// ─── Trust proxy (required behind ALB / API Gateway / CloudFront) ────────
app.set('trust proxy', 1);

// ─── Ensure DB is connected (serverless cold-start safety) ───────────────
app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Security & parsing ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────────
app.use(morgan('short'));

// ─── Rate limiting ───────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ─── API routes ──────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── 404 handler ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global error handler ────────────────────────────────────────────────
app.use(errorHandler);

export default app;
