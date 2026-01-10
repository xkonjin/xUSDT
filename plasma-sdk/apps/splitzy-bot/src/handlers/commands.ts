/**
 * Command Handlers
 * 
 * Handles Telegram bot commands:
 * - /start - Welcome message and introduction
 * - /help - Show available commands
 * - /split - Start a new bill split
 * - /wallet - Connect or view wallet
 * - /history - View past bill splits
 * - /cancel - Cancel current operation
 */

import type { Bot } from 'grammy';
import type { BotContext } from '../types.js';
import { DEFAULT_SESSION } from '../types.js';

// ============================================================================
// WELCOME MESSAGE
// ============================================================================

const WELCOME_MESSAGE = `
🧾 *Welcome to Splitzy!*

I help you split bills with friends instantly. Here's how it works:

1️⃣ *Snap a photo* of your receipt
2️⃣ I'll *extract the items* using AI
3️⃣ *Assign items* to your friends
4️⃣ Each person gets a *QR code* to pay
5️⃣ Payments arrive in your wallet *instantly*

💡 *Best part?* Friends can pay from *any chain* with *any token* - it all converts to USDT0 on Plasma with *zero gas fees*!

Ready to split? Send me a receipt photo or use /split to start!
`;

const HELP_MESSAGE = `
🧾 *Splitzy Commands*

/start - Welcome message
/split - Start a new bill split
/wallet - Connect your wallet
/history - View past splits
/cancel - Cancel current operation
/help - Show this message

*Quick Start:*
Just send me a photo of your receipt and I'll handle the rest!

*Need help?*
Visit [splitzy.app/help](https://splitzy.app/help) for guides.
`;

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * Registers all command handlers on the bot
 * 
 * @param bot - The grammY bot instance
 */
export function registerCommandHandlers(bot: Bot<BotContext>) {
  
  // /start - Welcome message
  bot.command('start', async (ctx) => {
    // Reset session on /start
    ctx.session = { ...DEFAULT_SESSION };
    
    await ctx.reply(WELCOME_MESSAGE, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📸 Scan Receipt', callback_data: 'start_scan' },
            { text: '💰 Split Now', callback_data: 'start_split' },
          ],
          [
            { text: '🔗 Connect Wallet', callback_data: 'connect_wallet' },
          ],
        ],
      },
    });
  });
  
  // /help - Show help message
  bot.command('help', async (ctx) => {
    await ctx.reply(HELP_MESSAGE, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
  });
  
  // /split - Start new bill split
  bot.command('split', async (ctx) => {
    // Check if user has wallet connected
    if (!ctx.session.walletAddress) {
      await ctx.reply(
        '⚠️ *Connect your wallet first!*\n\n' +
        'You need to connect a wallet to receive payments.\n\n' +
        'Use /wallet to connect your Plasma wallet.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Reset to new split flow
    ctx.session.step = 'awaiting_receipt';
    ctx.session.activeBill = undefined;
    
    await ctx.reply(
      '📸 *Ready to split a bill!*\n\n' +
      'Send me a photo of your receipt and I\'ll extract the items.\n\n' +
      '_Or type the total amount if you want to split equally._',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Enter Amount Manually', callback_data: 'manual_amount' },
            ],
            [
              { text: '❌ Cancel', callback_data: 'cancel' },
            ],
          ],
        },
      }
    );
  });
  
  // /wallet - Connect or view wallet
  bot.command('wallet', async (ctx) => {
    if (ctx.session.walletAddress) {
      // Wallet already connected - show details
      const shortAddress = `${ctx.session.walletAddress.slice(0, 6)}...${ctx.session.walletAddress.slice(-4)}`;
      
      await ctx.reply(
        `🔗 *Wallet Connected*\n\n` +
        `Address: \`${shortAddress}\`\n` +
        `Network: Plasma Chain\n\n` +
        `All bill split payments will be received at this address.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔄 Change Wallet', callback_data: 'change_wallet' },
                { text: '🔗 View on Explorer', url: `https://scan.plasma.to/address/${ctx.session.walletAddress}` },
              ],
            ],
          },
        }
      );
    } else {
      // No wallet connected - prompt to enter address
      ctx.session.step = 'awaiting_wallet';
      
      // Check if we have a valid HTTPS URL for Privy connection
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const hasHttpsUrl = appUrl.startsWith('https://');
      
      if (hasHttpsUrl) {
        // Production mode - show Privy connect button
        await ctx.reply(
          '🔗 *Connect Your Wallet*\n\n' +
          'Connect your Plasma wallet to receive bill split payments.\n\n' +
          'Tap the button below to connect:',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { 
                    text: '🔐 Connect with Privy', 
                    url: `${appUrl}/connect?tgUserId=${ctx.from?.id}`,
                  },
                ],
                [
                  { text: '📝 Enter Address Manually', callback_data: 'manual_address' },
                ],
              ],
            },
          }
        );
      } else {
        // Development mode - direct address entry
        await ctx.reply(
          '🔗 *Connect Your Wallet*\n\n' +
          'Enter your Plasma wallet address to receive bill split payments.\n\n' +
          'Paste your address (starting with 0x):',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '❌ Cancel', callback_data: 'cancel' },
                ],
              ],
            },
          }
        );
      }
    }
  });
  
  // /history - View past bill splits
  bot.command('history', async (ctx) => {
    // TODO: Implement history from database
    await ctx.reply(
      '📋 *Your Bill Splits*\n\n' +
      '_No bills yet!_\n\n' +
      'Start by sending a receipt photo or use /split.',
      { parse_mode: 'Markdown' }
    );
  });
  
  // /cancel - Cancel current operation
  bot.command('cancel', async (ctx) => {
    // Reset session
    ctx.session = { ...DEFAULT_SESSION };
    
    await ctx.reply(
      '❌ *Cancelled*\n\n' +
      'Current operation cancelled. Send a receipt photo or /split to start again.',
      { parse_mode: 'Markdown' }
    );
  });
  
  // Handle callback queries for inline buttons
  bot.callbackQuery('start_scan', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    ctx.session.step = 'awaiting_receipt';
    
    await ctx.editMessageText(
      '📸 *Send me a receipt photo!*\n\n' +
      'Take a clear photo of your receipt and I\'ll extract all the items automatically.\n\n' +
      '_Tip: Make sure the receipt is well-lit and text is readable._',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'cancel' }],
          ],
        },
      }
    );
  });
  
  bot.callbackQuery('start_split', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    // Check wallet first
    if (!ctx.session.walletAddress) {
      await ctx.editMessageText(
        '⚠️ *Connect your wallet first!*\n\n' +
        'You need a wallet to receive payments.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Connect Wallet', callback_data: 'connect_wallet' }],
            ],
          },
        }
      );
      return;
    }
    
    ctx.session.step = 'awaiting_receipt';
    
    await ctx.editMessageText(
      '💰 *Quick Split*\n\n' +
      'How would you like to split?\n\n' +
      '📸 Send a receipt photo to extract items\n' +
      '✏️ Or tap below to enter a total amount',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✏️ Enter Amount', callback_data: 'manual_amount' }],
            [{ text: '❌ Cancel', callback_data: 'cancel' }],
          ],
        },
      }
    );
  });
  
  bot.callbackQuery('connect_wallet', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    ctx.session.step = 'awaiting_wallet';
    
    // Check if we have a valid HTTPS URL for Privy connection
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const hasHttpsUrl = appUrl.startsWith('https://');
    
    if (hasHttpsUrl) {
      // Production mode - show Privy connect button
      await ctx.editMessageText(
        '🔗 *Connect Your Wallet*\n\n' +
        'Tap below to connect your Plasma wallet:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { 
                  text: '🔐 Connect with Privy', 
                  url: `${appUrl}/connect?tgUserId=${ctx.from?.id}`,
                },
              ],
              [
                { text: '📝 Enter Address Manually', callback_data: 'manual_address' },
              ],
              [
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    } else {
      // Development mode - direct address entry
      await ctx.editMessageText(
        '🔗 *Connect Your Wallet*\n\n' +
        'Enter your Plasma wallet address below.\n\n' +
        'Paste your address (starting with 0x):',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    }
  });
  
  bot.callbackQuery('cancel', async (ctx) => {
    await ctx.answerCallbackQuery('Cancelled');
    
    ctx.session = { ...DEFAULT_SESSION };
    
    await ctx.editMessageText(
      '❌ *Cancelled*\n\n' +
      'Send a receipt photo or /split to start again.',
      { parse_mode: 'Markdown' }
    );
  });
  
  bot.callbackQuery('manual_amount', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    ctx.session.step = 'entering_split_count';
    ctx.session.activeBill = {
      title: 'Quick Split',
      items: [],
      participants: [],
      taxPercent: 0,
      tipPercent: 0,
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      creatorAddress: ctx.session.walletAddress,
    };
    
    await ctx.editMessageText(
      '💵 *Enter Total Amount*\n\n' +
      'Type the total bill amount (e.g., `52.50`):',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'cancel' }],
          ],
        },
      }
    );
  });
  
  // Handle manual address entry
  bot.callbackQuery('manual_address', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    ctx.session.step = 'awaiting_wallet';
    
    await ctx.editMessageText(
      '📝 *Enter Wallet Address*\n\n' +
      'Type or paste your Plasma wallet address:\n\n' +
      '_Example: 0x1234...5678_',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'cancel' }],
          ],
        },
      }
    );
  });
}

