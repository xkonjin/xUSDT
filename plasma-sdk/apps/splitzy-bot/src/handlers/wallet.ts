/**
 * Wallet Handler
 * 
 * Handles wallet connection and management:
 * 1. Manual address entry
 * 2. Wallet verification
 * 3. Address updates
 * 
 * SPLITZY-002: Now persists wallets to database
 */

import type { Bot } from 'grammy';
import type { BotContext } from '../types.js';
import { isAddress } from 'viem';
import { saveTelegramWallet, getTelegramWallet, getWalletByTelegramId, saveWallet } from '../services/wallet.js';
import { getUserBillHistory } from '../services/payment.js';

// ============================================================================
// WALLET HANDLERS
// ============================================================================

/**
 * Registers wallet-related handlers
 * 
 * @param bot - The grammY bot instance
 */
export function registerWalletHandler(bot: Bot<BotContext>) {
  
  // Handle wallet address text input
  bot.on('message:text', async (ctx, next) => {
    // Only handle if we're awaiting wallet input
    if (ctx.session.step !== 'awaiting_wallet') {
      await next();
      return;
    }
    
    const text = ctx.message.text.trim();
    
    // Check if it looks like an Ethereum address
    if (!text.startsWith('0x') || text.length !== 42) {
      await ctx.reply(
        '⚠️ *Invalid address format*\n\n' +
        'Please enter a valid Ethereum/Plasma address:\n' +
        '_Example: 0x1234...5678 (42 characters starting with 0x)_',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Validate address using viem
    if (!isAddress(text)) {
      await ctx.reply(
        '⚠️ *Invalid address*\n\n' +
        'The address format is incorrect. Please check and try again.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Store wallet address in session
    ctx.session.walletAddress = text;
    ctx.session.step = 'idle';
    
    // Save to database for persistence (SPLITZY-002)
    if (ctx.from?.id) {
      try {
        await saveTelegramWallet(
          ctx.from.id.toString(),
          ctx.from.username,
          text
        );
        console.log(`Wallet saved for user ${ctx.from.id}`);
      } catch (error) {
        console.error('Failed to save wallet to database:', error);
        // Continue anyway - session still has the wallet
      }
    }
    
    const shortAddress = `${text.slice(0, 6)}...${text.slice(-4)}`;
    
    await ctx.reply(
      `✅ *Wallet Connected!*\n\n` +
      `Address: \`${shortAddress}\`\n` +
      `Network: Plasma Chain\n\n` +
      `All bill split payments will be sent to this address.\n\n` +
      `Ready to split? Send a receipt photo or use /split!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📸 Scan Receipt', callback_data: 'start_scan' },
              { text: '💰 Quick Split', callback_data: 'start_split' },
            ],
          ],
        },
      }
    );
  });
  
  // Handle "Change Wallet" button
  bot.callbackQuery('change_wallet', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    ctx.session.step = 'awaiting_wallet';
    
    await ctx.editMessageText(
      '🔄 *Change Wallet*\n\n' +
      `Current: \`${ctx.session.walletAddress?.slice(0, 6)}...${ctx.session.walletAddress?.slice(-4)}\`\n\n` +
      'Enter your new Plasma wallet address:',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Keep Current', callback_data: 'cancel' }],
          ],
        },
      }
    );
  });
  
  // Handle wallet connection callback from webapp
  // This would be called via a webhook when user connects via Privy Mini App
  bot.callbackQuery(/^wallet_connected_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('Wallet connected!');
    
    const address = ctx.match[1];
    
    if (!isAddress(address)) {
      await ctx.reply('❌ Invalid wallet address received. Please try again.');
      return;
    }
    
    ctx.session.walletAddress = address;
    ctx.session.step = 'idle';
    
    // Save to database for persistence (SPLITZY-002)
    if (ctx.from?.id) {
      try {
        await saveTelegramWallet(
          ctx.from.id.toString(),
          ctx.from.username,
          address
        );
      } catch (error) {
        console.error('Failed to save wallet to database:', error);
      }
    }
    
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    
    await ctx.editMessageText(
      `✅ *Wallet Connected!*\n\n` +
      `Address: \`${shortAddress}\`\n` +
      `Network: Plasma Chain\n\n` +
      `Ready to split bills!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📸 Scan Receipt', callback_data: 'start_scan' },
              { text: '💰 Quick Split', callback_data: 'start_split' },
            ],
          ],
        },
      }
    );
  });
}

/**
 * Loads saved wallet from database into session
 * Called when bot starts or when handling a new message from a user
 * 
 * @param telegramUserId - Telegram user ID
 * @returns Wallet address or null
 */
export async function loadSavedWallet(telegramUserId: number): Promise<string | null> {
  try {
    const wallet = await getTelegramWallet(telegramUserId.toString());
    return wallet?.walletAddress || null;
  } catch (error) {
    console.error('Failed to load wallet from database:', error);
    return null;
  }
}

// ============================================================================
// HISTORY COMMAND HANDLER (SPLITZY-003)
// ============================================================================

/**
 * Registers the /history command handler
 * Shows user's bill split history
 * 
 * @param bot - The grammY bot instance
 */
export function registerHistoryHandler(bot: Bot<BotContext>) {
  bot.command('history', async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) {
      await ctx.reply('Could not identify user.');
      return;
    }

    const bills = await getUserBillHistory(telegramId, 10);

    if (bills.length === 0) {
      await ctx.reply(
        '📋 *Your Bill History*\n\n' +
        '_No bills yet!_\n\n' +
        'Start by sending a receipt photo or use /split.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = '📜 *Your Bill History*\n\n';
    
    for (const bill of bills) {
      const status = bill.paidCount === bill.participantCount ? '✅' : '⏳';
      const role = bill.isCreator ? '👑' : '👤';
      message += `${status} ${role} *${bill.name}*\n`;
      message += `   💰 $${bill.total.toFixed(2)} • ${bill.paidCount}/${bill.participantCount} paid\n`;
      message += `   📅 ${new Date(bill.createdAt).toLocaleDateString()}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });
}

