require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const url = 'https://managmentbot.vercel.app';
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  webHook: {
    port: process.env.PORT || 3000
  }
});

const initBot = async () => {
  try {
    await bot.setWebHook(`${url}/api/webhook`);
    console.log('Webhook set successfully');
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
};

module.exports = { bot, initBot };
