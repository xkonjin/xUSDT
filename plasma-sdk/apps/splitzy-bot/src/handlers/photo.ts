/**
 * Photo Handler
 * 
 * Handles receipt photo messages:
 * 1. Downloads the photo from Telegram
 * 2. Sends to OpenAI Vision for OCR
 * 3. Extracts items, prices, and totals
 * 4. Presents results for user confirmation
 */

import type { Bot } from 'grammy';
import type { BotContext, ScannedItem, ReceiptScanResult } from '../types.js';
import { PARTICIPANT_COLORS } from '../types.js';
import { scanReceipt } from '../services/ocr.js';
import { nanoid } from 'nanoid';

// ============================================================================
// PHOTO MESSAGE HANDLER
// ============================================================================

/**
 * Registers the photo message handler
 * 
 * @param bot - The grammY bot instance
 */
export function registerPhotoHandler(bot: Bot<BotContext>) {
  
  // Handle photo messages
  bot.on('message:photo', async (ctx) => {
    // Check if user has wallet connected
    if (!ctx.session.walletAddress) {
      await ctx.reply(
        '⚠️ *Connect your wallet first!*\n\n' +
        'You need a wallet to receive payments.\n' +
        'Use /wallet to connect.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Get the largest photo (last in array)
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];
    
    // Send processing message
    const processingMsg = await ctx.reply(
      '🔍 *Scanning receipt...*\n\n' +
      '_Using AI to extract items and prices_',
      { parse_mode: 'Markdown' }
    );
    
    try {
      // Get file URL from Telegram
      const file = await ctx.api.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      // Scan receipt using OpenAI Vision
      const scanResult = await scanReceipt(fileUrl);
      
      if (!scanResult || !scanResult.items || scanResult.items.length === 0) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          processingMsg.message_id,
          '❌ *Couldn\'t read the receipt*\n\n' +
          'Please try again with:\n' +
          '• Better lighting\n' +
          '• Clearer focus\n' +
          '• Full receipt visible\n\n' +
          '_Or use /split to enter items manually_',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Add IDs to items
      const itemsWithIds: ScannedItem[] = scanResult.items.map((item) => ({
        id: nanoid(8),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));
      
      // Calculate totals
      const subtotal = itemsWithIds.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = scanResult.tax || (scanResult.taxPercent ? subtotal * (scanResult.taxPercent / 100) : 0);
      const tip = scanResult.tip || 0;
      const total = scanResult.total || (subtotal + tax + tip);
      
      // Store in session
      ctx.session.activeBill = {
        title: scanResult.merchant || 'Bill Split',
        items: itemsWithIds,
        participants: [],
        taxPercent: scanResult.taxPercent || (tax > 0 ? Math.round((tax / subtotal) * 100) : 0),
        tipPercent: scanResult.tipPercent || 0,
        subtotal,
        tax,
        tip,
        total,
        creatorAddress: ctx.session.walletAddress,
      };
      ctx.session.step = 'confirming_items';
      
      // Build items list message
      let itemsList = scanResult.items.map((item, i) => 
        `${i + 1}. ${item.name} - $${item.price.toFixed(2)}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`
      ).join('\n');
      
      // Build summary
      let summary = `\n\n💰 *Summary*\n`;
      summary += `Subtotal: $${subtotal.toFixed(2)}\n`;
      if (tax > 0) summary += `Tax: $${tax.toFixed(2)}\n`;
      if (tip > 0) summary += `Tip: $${tip.toFixed(2)}\n`;
      summary += `*Total: $${total.toFixed(2)}*`;
      
      // Confidence indicator
      const confidence = scanResult.confidence >= 0.9 ? '🟢' : 
                         scanResult.confidence >= 0.7 ? '🟡' : '🔴';
      
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `🧾 *${scanResult.merchant || 'Receipt Scanned'}* ${confidence}\n\n` +
        `*Items Found:*\n${itemsList}` +
        summary +
        `\n\n_Is this correct?_`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Looks Good', callback_data: 'confirm_items' },
                { text: '✏️ Edit', callback_data: 'edit_items' },
              ],
              [
                { text: '🔄 Rescan', callback_data: 'rescan' },
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
      
    } catch (error) {
      console.error('Receipt scan error:', error);
      
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        '❌ *Error scanning receipt*\n\n' +
        'Something went wrong. Please try again or use /split to enter items manually.',
        { parse_mode: 'Markdown' }
      );
    }
  });
  
  // Handle item confirmation
  bot.callbackQuery('confirm_items', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    if (!ctx.session.activeBill) {
      await ctx.editMessageText('❌ Session expired. Please /split again.');
      return;
    }
    
    ctx.session.step = 'entering_split_count';
    
    await ctx.editMessageText(
      `✅ *Items Confirmed!*\n\n` +
      `Total: $${ctx.session.activeBill.total.toFixed(2)}\n\n` +
      `How many people are splitting this bill?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '2', callback_data: 'split_count_2' },
              { text: '3', callback_data: 'split_count_3' },
              { text: '4', callback_data: 'split_count_4' },
              { text: '5', callback_data: 'split_count_5' },
            ],
            [
              { text: '6', callback_data: 'split_count_6' },
              { text: '7', callback_data: 'split_count_7' },
              { text: '8', callback_data: 'split_count_8' },
              { text: 'More...', callback_data: 'split_count_custom' },
            ],
            [
              { text: '❌ Cancel', callback_data: 'cancel' },
            ],
          ],
        },
      }
    );
  });
  
  // Handle rescan
  bot.callbackQuery('rescan', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    ctx.session.step = 'awaiting_receipt';
    ctx.session.activeBill = undefined;
    
    await ctx.editMessageText(
      '📸 *Send another photo*\n\n' +
      'Take a clearer photo of the receipt.',
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
  
  // Handle edit items (simplified - just show items for manual adjustment)
  bot.callbackQuery('edit_items', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    await ctx.editMessageText(
      '✏️ *Edit Items*\n\n' +
      'To add an item, send a message like:\n' +
      '`add Burger 12.99`\n\n' +
      'To remove an item, send:\n' +
      '`remove 1` (item number)\n\n' +
      'When done, tap *Continue*.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '➡️ Continue', callback_data: 'confirm_items' },
              { text: '❌ Cancel', callback_data: 'cancel' },
            ],
          ],
        },
      }
    );
  });
  
  // Handle split count selection
  for (let i = 2; i <= 8; i++) {
    bot.callbackQuery(`split_count_${i}`, async (ctx) => {
      await ctx.answerCallbackQuery();
      await handleSplitCount(ctx, i);
    });
  }
  
  bot.callbackQuery('split_count_custom', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    ctx.session.step = 'entering_split_count';
    
    await ctx.editMessageText(
      '🔢 *Enter number of people*\n\n' +
      'Type the number (2-20):',
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

/**
 * Handle split count selection - creates participant slots
 */
async function handleSplitCount(ctx: BotContext, count: number) {
  if (!ctx.session.activeBill) {
    await ctx.editMessageText('❌ Session expired. Please /split again.');
    return;
  }
  
  // Calculate equal share
  const sharePerPerson = ctx.session.activeBill.total / count;
  
  // Create participant slots
  ctx.session.activeBill.participants = Array.from({ length: count }, (_, i) => ({
    id: nanoid(8),
    name: `Person ${i + 1}`,
    assignedItemIds: [],
    share: sharePerPerson,
    color: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
  }));
  
  ctx.session.step = 'confirming_split';
  
  // Build message
  const bill = ctx.session.activeBill;
  let message = `💰 *Equal Split*\n\n`;
  message += `Total: $${bill.total.toFixed(2)}\n`;
  message += `Split ${count} ways: *$${sharePerPerson.toFixed(2)} each*\n\n`;
  message += `How do you want to share?\n\n`;
  message += `📲 *Telegram DMs* - I'll message your friends directly\n`;
  message += `🔗 *QR Codes* - Get QR codes to share\n`;
  
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📲 Name Participants', callback_data: 'name_participants' },
        ],
        [
          { text: '🔗 Get QR Codes (Anonymous)', callback_data: 'generate_qr_anonymous' },
        ],
        [
          { text: '📊 Assign Items Individually', callback_data: 'assign_items' },
        ],
        [
          { text: '❌ Cancel', callback_data: 'cancel' },
        ],
      ],
    },
  });
}

