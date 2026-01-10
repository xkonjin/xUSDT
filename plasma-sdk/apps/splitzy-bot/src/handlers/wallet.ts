/**
 * Wallet Handler
 * 
 * Handles wallet connection and management:
 * 1. Manual address entry
 * 2. Wallet verification
 * 3. Address updates
 */

import type { Bot } from 'grammy';
import type { BotContext } from '../types.js';
import { isAddress } from 'viem';

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
    
    // Store wallet address
    ctx.session.walletAddress = text;
    ctx.session.step = 'idle';
    
    // TODO: Save to database for persistence
    // await saveTelegramWallet(ctx.from?.id, ctx.from?.username, text);
    
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

