/**
 * Billing Worker — BullMQ repeatable job that runs every 10 seconds.
 *
 * For each active call, the worker:
 * 1. Calculates charge = pricePerMinute / 6 (10-second slice)
 * 2. Deducts from customer wallet (atomic)
 * 3. Adds earnings to caller (minus platform commission)
 * 4. Updates call session running totals
 * 5. Emits billing_tick via WebSocket
 * 6. Ends call automatically when customer balance is insufficient
 */
import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { CallSession } from '../models';
import * as walletService from '../services/walletService';
import * as callService from '../services/callService';
import {
  emitBillingTick,
  emitInsufficientBalance,
  emitBalanceUpdate,
} from '../websocket/socketServer';
import { config } from '../config';
import logger from '../utils/logger';

const QUEUE_NAME = 'billing';
const JOB_NAME = 'billing-tick';

// ─── Queue setup ────────────────────────────────────────────────────────────
export const billingQueue = new Queue(QUEUE_NAME, {
  connection: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

/**
 * Start the billing worker and schedule the repeatable job.
 */
export async function startBillingWorker(): Promise<void> {
  // Schedule repeatable job every BILLING_INTERVAL_SECONDS
  await billingQueue.add(
    JOB_NAME,
    {},
    {
      repeat: {
        every: config.platform.billingIntervalSeconds * 1000, // ms
      },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );

  // ─── Worker processor ──────────────────────────────────────────────
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      try {
        await processBillingTick();
      } catch (err) {
        logger.error('Billing tick error:', err);
      }
    },
    {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      concurrency: 1, // sequential billing to avoid race conditions
    },
  );

  worker.on('completed', () => {
    // Silent — runs every 10s
  });

  worker.on('failed', (job, err) => {
    logger.error(`Billing job failed: ${err.message}`);
  });

  logger.info(`Billing worker started — interval: ${config.platform.billingIntervalSeconds}s`);
}

/**
 * Core billing logic — processes all active calls.
 */
async function processBillingTick(): Promise<void> {
  // Find all active calls
  const activeCalls = await CallSession.find({ status: 'active' });

  if (activeCalls.length === 0) return;

  logger.debug(`Billing tick: processing ${activeCalls.length} active call(s)`);

  for (const session of activeCalls) {
    try {
      await processCallBilling(session);
    } catch (err) {
      logger.error(`Billing error for call ${session._id}:`, err);
    }
  }
}

/**
 * Process billing for a single active call session.
 */
async function processCallBilling(session: any): Promise<void> {
  const callId = session._id.toString();
  const customerId = session.customerId.toString();
  const callerId = session.callerId.toString();
  const interval = config.platform.billingIntervalSeconds;

  // Calculate charge for this tick: pricePerMinute / (60 / interval)
  const ticksPerMinute = 60 / interval;
  const chargePerTick = session.pricePerMinute / ticksPerMinute;

  // Platform commission
  const commissionRate = config.platform.commissionPercent / 100;
  const commission = chargePerTick * commissionRate;
  const callerEarning = chargePerTick - commission;

  // 1. Attempt to deduct from customer wallet
  const deductResult = await walletService.deductForCall(customerId, chargePerTick, callId);

  if (!deductResult) {
    // ─── Insufficient balance — end call ─────────────────────────
    logger.warn(`Insufficient balance for call ${callId} — ending call`);

    await callService.endCall(callId, customerId, 'insufficient_balance');
    emitInsufficientBalance(customerId, callerId, callId);
    return;
  }

  // 2. Add earnings to caller wallet
  await walletService.addEarnings(callerId, callerEarning, callId);

  // 3. Update session running totals
  const now = new Date();
  const durationSeconds = Math.floor(
    (now.getTime() - (session.startTime?.getTime() || now.getTime())) / 1000,
  );

  session.totalCost += chargePerTick;
  session.platformCommission += commission;
  session.callerEarnings += callerEarning;
  session.durationSeconds = durationSeconds;
  await session.save();

  // 4. Emit billing tick to both parties via WebSocket
  emitBillingTick(customerId, callerId, {
    callId,
    durationSeconds,
    totalCost: session.totalCost,
    customerBalance: deductResult.balance,
    callerEarnings: session.callerEarnings,
  });

  // 5. Emit balance updates
  emitBalanceUpdate(customerId, deductResult.balance);
}
