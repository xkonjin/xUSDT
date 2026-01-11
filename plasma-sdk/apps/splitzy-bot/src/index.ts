/**
 * Splitzy Bot - Main Entry Point
 * 
 * Telegram bot for bill splitting that:
 * 1. Scans receipts using AI (OpenAI Vision)
 * 2. Splits bills among participants
 * 3. Generates QR codes for payment
 * 4. Accepts payments from any chain via Jumper/deBridge
 * 5. Settles payments to Plasma USDT0 with zero gas fees
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script (works in ESM, unlike __dirname)
// This ensures dotenv finds .env files even when running from monorepo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = resolve(__dirname, '..');

// Load environment variables from .env.local first, then .env as fallback
// Uses the app's directory, not process.cwd() which may be the monorepo root
config({ path: resolve(appRoot, '.env.local') });
config({ path: resolve(appRoot, '.env') });
import { Bot, session, GrammyError, HttpError } from 'grammy';
import type { BotContext, SessionData } from './types.js';
import { DEFAULT_SESSION } from './types.js';

// Import handlers
import { registerPhotoHandler } from './handlers/photo.js';
import { registerSplitHandler } from './handlers/split.js';
import { registerWalletHandler, loadSavedWallet, registerHistoryHandler } from './handlers/wallet.js';
import { registerCommandHandlers } from './handlers/commands.js';

// Import services for database initialization
import { initializeDatabase, cleanupExpiredIntents } from './services/payment.js';
import { loadTelegramWalletsToCache } from './services/wallet.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
}

// ============================================================================
// BOT INITIALIZATION
// ============================================================================

// Create bot instance with custom context type
const bot = new Bot<BotContext>(BOT_TOKEN);

// Configure session middleware
// Uses in-memory storage by default (use Redis for production)
bot.use(session({
  initial: (): SessionData => ({ ...DEFAULT_SESSION }),
}));

// Middleware to load saved wallet from database when user first interacts
bot.use(async (ctx, next) => {
  // If session has no wallet but user has one saved in DB, load it
  if (!ctx.session.walletAddress && ctx.from?.id) {
    const savedWallet = await loadSavedWallet(ctx.from.id);
    if (savedWallet) {
      ctx.session.walletAddress = savedWallet;
      console.log(`Loaded saved wallet for user ${ctx.from.id}`);
    }
  }
  await next();
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Global error handler for the bot
 * Catches and logs all errors, preventing crashes
 */
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error handling update ${ctx.update.update_id}:`);
  
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Grammy API error:', e.description);
  } else if (e instanceof HttpError) {
    console.error('HTTP error:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

// ============================================================================
// REGISTER HANDLERS
// ============================================================================

// Register all command handlers (/start, /help, /split, /wallet, etc.)
registerCommandHandlers(bot);

// Register photo message handler (receipt scanning)
registerPhotoHandler(bot);

// Register split flow handlers (inline keyboards, callbacks)
registerSplitHandler(bot);

// Register wallet connection handlers
registerWalletHandler(bot);

// Register history handler (SPLITZY-003)
registerHistoryHandler(bot);

// ============================================================================
// START BOT
// ============================================================================

/**
 * Start the bot using either long polling (development) or webhooks (production)
 */
async function startBot() {
  console.log('🧾 Starting Splitzy Bot...');
  
  // Initialize database connection (SPLITZY-001, SPLITZY-002)
  try {
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Load cached wallets for faster lookup
    const walletCount = await loadTelegramWalletsToCache();
    console.log(`📱 Loaded ${walletCount} saved wallet(s)`);
    
    // Start periodic cleanup of expired payment intents (every hour)
    setInterval(async () => {
      try {
        const cleaned = await cleanupExpiredIntents();
        if (cleaned > 0) {
          console.log(`🧹 Cleaned ${cleaned} expired payment intent(s)`);
        }
      } catch (error) {
        console.error('Failed to cleanup expired intents:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('⚠️ Bot will continue with in-memory storage only');
  }
  
  // Check if we should use webhooks (production)
  if (WEBHOOK_URL && WEBHOOK_SECRET) {
    console.log(`📡 Setting up webhook at ${WEBHOOK_URL}`);
    
    // Delete any existing webhook first
    await bot.api.deleteWebhook();
    
    // Set the new webhook
    await bot.api.setWebhook(WEBHOOK_URL, {
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query', 'inline_query'],
    });
    
    console.log('✅ Webhook configured');
    console.log('💡 Bot is ready to receive updates via webhook');
  } else {
    // Development mode - use long polling
    console.log('🔄 Starting in long polling mode (development)');
    
    // Delete any existing webhook to avoid conflicts
    await bot.api.deleteWebhook();
    
    // Start polling
    await bot.start({
      onStart: (botInfo) => {
        console.log(`✅ Bot started as @${botInfo.username}`);
        console.log('📱 Send a receipt photo to get started!');
      },
    });
  }
}

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

// Start the bot
startBot().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

// Export bot for webhook handler (if used with Next.js API route)
export { bot };

