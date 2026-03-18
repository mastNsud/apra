const TelegramBot = require('node-telegram-bot-api');
const { askAI, parseAIResponse } = require('./botEngine');
const { logChat, upsertLead } = require('./leadService');

const token = process.env.TELEGRAM_BOT_TOKEN;

// Only initialize if token is provided
if (!token) {
  console.log('Telegram Bot Token not provided. Skipping Telegram initialization.');
  return;
}

const bot = new TelegramBot(token, { polling: true });
const sessions = {};

console.log('Telegram Bot is polling...');

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return; // ignores unsupported message types

  if (!sessions[chatId]) {
    sessions[chatId] = { history: [], collectedData: {} };
  }

  const session = sessions[chatId];
  session.history.push({ role: 'user', content: text });
  await logChat(chatId, 'user', text);

  try {
    const aiRawResponse = await askAI(session.history);
    session.history.push({ role: 'assistant', content: aiRawResponse });
    await logChat(chatId, 'assistant', aiRawResponse);

    await upsertLead(chatId, session.collectedData, 'telegram');

    const { cleanMessage, buttons } = parseAIResponse(aiRawResponse);
    
    // Telegram Inline Keyboard for buttons
    let options = {};
    if (buttons.length > 0) {
      options.reply_markup = {
        inline_keyboard: buttons.map(btn => [{ text: btn, callback_data: btn.substring(0, 60) }])
      };
    }

    bot.sendMessage(chatId, cleanMessage, options);
  } catch (err) {
    console.error('Telegram polling error:', err);
    bot.sendMessage(chatId, "I'm experiencing some technical difficulties. Please try again later.");
  }
});

// Handle button clicks
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const data = callbackQuery.data;
  
  // Treat callback data as user message
  bot.emit('message', { chat: { id: message.chat.id }, text: data });
  // Answer callback query so the loading state goes away on user client
  bot.answerCallbackQuery(callbackQuery.id);
});
