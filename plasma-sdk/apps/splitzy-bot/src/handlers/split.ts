/**
 * Split Flow Handler
 * 
 * Handles the bill splitting flow:
 * 1. Participant naming
 * 2. Item assignment
 * 3. Share calculation
 * 4. QR code generation
 * 5. Payment link creation
 */

import type { Bot } from 'grammy';
import type { BotContext } from '../types.js';
import { generatePaymentQRCodes } from '../services/qr.js';
import { createPaymentIntents } from '../services/payment.js';
import { nanoid } from 'nanoid';

// ============================================================================
// SPLIT FLOW HANDLERS
// ============================================================================

/**
 * Registers split flow handlers
 * 
 * @param bot - The grammY bot instance
 */
export function registerSplitHandler(bot: Bot<BotContext>) {
  
  // Handle "Name Participants" button
  bot.callbackQuery('name_participants', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    if (!ctx.session.activeBill) {
      await ctx.editMessageText('❌ Session expired. Please /split again.');
      return;
    }
    
    ctx.session.step = 'entering_participants';
    
    const count = ctx.session.activeBill.participants.length;
    
    await ctx.editMessageText(
      `👥 *Name Your Participants*\n\n` +
      `Enter ${count} names/usernames, one per line:\n\n` +
      `_Example:_\n` +
      `\`Alice\`\n` +
      `\`@bob\`\n` +
      `\`Charlie\`\n\n` +
      `_Telegram usernames (with @) will get DM'd automatically!_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏩ Skip (Use Person 1, 2, 3...)', callback_data: 'generate_qr_anonymous' }],
            [{ text: '❌ Cancel', callback_data: 'cancel' }],
          ],
        },
      }
    );
  });
  
  // Handle anonymous QR generation (equal split)
  bot.callbackQuery('generate_qr_anonymous', async (ctx) => {
    await ctx.answerCallbackQuery();
    await generateAndSendQRCodes(ctx);
  });
  
  // Handle item assignment flow
  bot.callbackQuery('assign_items', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    if (!ctx.session.activeBill || ctx.session.activeBill.items.length === 0) {
      await ctx.editMessageText('❌ No items to assign. Please /split again.');
      return;
    }
    
    ctx.session.step = 'assigning_items';
    
    // Start with first item
    await showItemAssignment(ctx, 0);
  });
  
  // Handle text messages for participant names and amounts
  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    
    // Handle participant name entry
    if (ctx.session.step === 'entering_participants') {
      if (!ctx.session.activeBill) {
        await ctx.reply('❌ Session expired. Please /split again.');
        return;
      }
      
      // Parse names (one per line or comma-separated)
      const names = text.split(/[\n,]/).map(n => n.trim()).filter(n => n);
      const expectedCount = ctx.session.activeBill.participants.length;
      
      if (names.length !== expectedCount) {
        await ctx.reply(
          `⚠️ Expected ${expectedCount} names, got ${names.length}.\n\n` +
          `Please enter exactly ${expectedCount} names, one per line.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Update participant names
      names.forEach((name, i) => {
        const participant = ctx.session.activeBill!.participants[i];
        participant.name = name.replace('@', '');
        if (name.startsWith('@')) {
          participant.telegramUsername = name.replace('@', '');
        }
      });
      
      // Proceed to generate QR codes
      await generateAndSendQRCodes(ctx);
      return;
    }
    
    // Handle manual amount entry
    if (ctx.session.step === 'entering_split_count' && ctx.session.activeBill?.items.length === 0) {
      const amount = parseFloat(text.replace(/[$,]/g, ''));
      
      if (isNaN(amount) || amount <= 0) {
        await ctx.reply(
          '⚠️ Please enter a valid amount (e.g., `52.50`)',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Update bill with manual amount
      ctx.session.activeBill.total = amount;
      ctx.session.activeBill.subtotal = amount;
      ctx.session.activeBill.items = [{
        id: nanoid(8),
        name: 'Total Bill',
        price: amount,
        quantity: 1,
      }];
      
      // Ask for split count
      await ctx.reply(
        `💵 *Total: $${amount.toFixed(2)}*\n\n` +
        `How many people are splitting?`,
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
            ],
          },
        }
      );
      return;
    }
    
    // Handle custom split count
    if (ctx.session.step === 'entering_split_count' && ctx.session.activeBill) {
      const count = parseInt(text);
      
      if (isNaN(count) || count < 2 || count > 20) {
        await ctx.reply('⚠️ Please enter a number between 2 and 20.');
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
        color: ['#00d4ff', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7', '#22c55e', '#f97316', '#ec4899'][i % 8],
      }));
      
      ctx.session.step = 'confirming_split';
      
      await ctx.reply(
        `💰 *Split ${count} Ways*\n\n` +
        `Total: $${ctx.session.activeBill.total.toFixed(2)}\n` +
        `Each person: *$${sharePerPerson.toFixed(2)}*`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📲 Name Participants', callback_data: 'name_participants' }],
              [{ text: '🔗 Get QR Codes', callback_data: 'generate_qr_anonymous' }],
              [{ text: '❌ Cancel', callback_data: 'cancel' }],
            ],
          },
        }
      );
      return;
    }
    
    // Pass to next handler if not handled
    await next();
  });
  
  // Handle item assignment callbacks
  bot.callbackQuery(/^assign_(\w+)_to_(\w+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    if (!ctx.session.activeBill) return;
    
    const match = ctx.match;
    const itemId = match[1];
    const participantId = match[2];
    
    // Find item and participant
    const item = ctx.session.activeBill.items.find(i => i.id === itemId);
    const participant = ctx.session.activeBill.participants.find(p => p.id === participantId);
    
    if (!item || !participant) return;
    
    // Toggle assignment
    const assignedIdx = participant.assignedItemIds.indexOf(itemId);
    if (assignedIdx >= 0) {
      participant.assignedItemIds.splice(assignedIdx, 1);
    } else {
      participant.assignedItemIds.push(itemId);
    }
    
    // Recalculate shares
    recalculateShares(ctx);
    
    // Find current item index and show next
    const currentIdx = ctx.session.activeBill.items.findIndex(i => i.id === itemId);
    await showItemAssignment(ctx, currentIdx);
  });
  
  // Handle "Next Item" button
  bot.callbackQuery(/^next_item_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const nextIdx = parseInt(ctx.match[1]);
    await showItemAssignment(ctx, nextIdx);
  });
  
  // Handle "Done Assigning"
  bot.callbackQuery('done_assigning', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showSplitSummary(ctx);
  });
  
  // Handle "Confirm Split" - generate QR codes
  bot.callbackQuery('confirm_split_final', async (ctx) => {
    await ctx.answerCallbackQuery();
    await generateAndSendQRCodes(ctx);
  });
}

/**
 * Show item assignment UI for a specific item
 */
async function showItemAssignment(ctx: BotContext, itemIdx: number) {
  if (!ctx.session.activeBill) return;
  
  const items = ctx.session.activeBill.items;
  const participants = ctx.session.activeBill.participants;
  
  if (itemIdx >= items.length) {
    // All items assigned, show summary
    await showSplitSummary(ctx);
    return;
  }
  
  const item = items[itemIdx];
  
  // Build participant buttons
  const buttons = participants.map(p => {
    const isAssigned = p.assignedItemIds.includes(item.id);
    return {
      text: `${isAssigned ? '✅' : '⬜'} ${p.name}`,
      callback_data: `assign_${item.id}_to_${p.id}`,
    };
  });
  
  // Split into rows of 2
  const buttonRows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    buttonRows.push(buttons.slice(i, i + 2));
  }
  
  // Navigation buttons
  buttonRows.push([
    { text: '⬅️ Prev', callback_data: `next_item_${Math.max(0, itemIdx - 1)}` },
    { text: `${itemIdx + 1}/${items.length}`, callback_data: 'noop' },
    { text: '➡️ Next', callback_data: `next_item_${itemIdx + 1}` },
  ]);
  buttonRows.push([
    { text: '✅ Done', callback_data: 'done_assigning' },
    { text: '❌ Cancel', callback_data: 'cancel' },
  ]);
  
  await ctx.editMessageText(
    `📝 *Who had this item?*\n\n` +
    `*${item.name}* - $${item.price.toFixed(2)}${item.quantity > 1 ? ` ×${item.quantity}` : ''}\n\n` +
    `_Tap names to assign. Shared items can be assigned to multiple people._`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttonRows },
    }
  );
}

/**
 * Recalculate shares based on item assignments
 */
function recalculateShares(ctx: BotContext) {
  if (!ctx.session.activeBill) return;
  
  const bill = ctx.session.activeBill;
  
  // Reset shares
  bill.participants.forEach(p => p.share = 0);
  
  // Calculate item shares
  bill.items.forEach(item => {
    const assignedParticipants = bill.participants.filter(p => 
      p.assignedItemIds.includes(item.id)
    );
    
    if (assignedParticipants.length === 0) {
      // Unassigned items split equally among all
      const sharePerPerson = (item.price * item.quantity) / bill.participants.length;
      bill.participants.forEach(p => p.share += sharePerPerson);
    } else {
      // Split among assigned participants
      const sharePerPerson = (item.price * item.quantity) / assignedParticipants.length;
      assignedParticipants.forEach(p => p.share += sharePerPerson);
    }
  });
  
  // Add tax and tip proportionally
  if (bill.tax > 0 || bill.tip > 0) {
    const subtotalShares = bill.participants.reduce((sum, p) => sum + p.share, 0);
    bill.participants.forEach(p => {
      const proportion = p.share / subtotalShares;
      p.share += (bill.tax + bill.tip) * proportion;
    });
  }
}

/**
 * Show split summary before QR generation
 */
async function showSplitSummary(ctx: BotContext) {
  if (!ctx.session.activeBill) return;
  
  // Recalculate final shares
  recalculateShares(ctx);
  
  const bill = ctx.session.activeBill;
  
  let message = `📊 *Split Summary*\n\n`;
  message += `🧾 *${bill.title}* - $${bill.total.toFixed(2)}\n\n`;
  
  bill.participants.forEach((p, i) => {
    const assignedItems = bill.items.filter(item => 
      p.assignedItemIds.includes(item.id)
    );
    
    message += `*${p.name}* - $${p.share.toFixed(2)}\n`;
    if (assignedItems.length > 0) {
      message += assignedItems.map(item => `  • ${item.name}`).join('\n');
      message += '\n';
    }
  });
  
  message += `\n_Ready to generate payment links?_`;
  
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Generate QR Codes', callback_data: 'confirm_split_final' }],
        [{ text: '✏️ Adjust Split', callback_data: 'assign_items' }],
        [{ text: '❌ Cancel', callback_data: 'cancel' }],
      ],
    },
  });
}

/**
 * Generate and send QR codes for all participants
 */
async function generateAndSendQRCodes(ctx: BotContext) {
  if (!ctx.session.activeBill) {
    await ctx.editMessageText('❌ Session expired. Please /split again.');
    return;
  }
  
  const bill = ctx.session.activeBill;
  
  // Ensure shares are calculated
  recalculateShares(ctx);
  
  // Show processing message
  if (ctx.callbackQuery) {
    await ctx.editMessageText(
      '⏳ *Generating payment links...*\n\n' +
      '_Creating QR codes for each participant_',
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      '⏳ *Generating payment links...*\n\n' +
      '_Creating QR codes for each participant_',
      { parse_mode: 'Markdown' }
    );
  }
  
  try {
    // Create payment intents in database
    const paymentIntents = await createPaymentIntents(
      bill,
      ctx.from?.id?.toString() || 'unknown'
    );
    
    // Generate QR codes
    const qrCodes = await generatePaymentQRCodes(paymentIntents, bill.participants);
    
    // Send QR codes
    for (let i = 0; i < qrCodes.length; i++) {
      const qr = qrCodes[i];
      const participant = bill.participants[i];
      
      // Send QR code image - grammY accepts InputFile with source Buffer
      await ctx.replyWithPhoto(
        { source: Buffer.from(qr.qrCodeBuffer) } as any,
        {
          caption: 
            `💳 *${participant.name}*\n\n` +
            `Amount: *$${participant.share.toFixed(2)}*\n` +
            `Link: ${qr.paymentUrl}\n\n` +
            `_Scan or tap link to pay with any wallet_`,
          parse_mode: 'Markdown',
        }
      );
    }
    
    // Send summary
    await ctx.reply(
      `✅ *Payment links ready!*\n\n` +
      `🧾 ${bill.title} - $${bill.total.toFixed(2)}\n` +
      `👥 ${bill.participants.length} participants\n\n` +
      `Share the QR codes above or forward them directly.\n\n` +
      `_I'll notify you when payments arrive!_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Copy All Links', callback_data: 'copy_all_links' }],
            [{ text: '📊 Track Payments', callback_data: 'track_payments' }],
          ],
        },
      }
    );
    
    // Reset session
    ctx.session.step = 'idle';
    ctx.session.activeBill = undefined;
    
  } catch (error) {
    console.error('QR generation error:', error);
    await ctx.reply(
      '❌ *Error generating payment links*\n\n' +
      'Please try again with /split.',
      { parse_mode: 'Markdown' }
    );
  }
}

