require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Production (Vercel) environment
const token = process.env.TELEGRAM_BOT_TOKEN;
const isProd = process.env.NODE_ENV === 'production';
const url = 'https://managmentbot.vercel.app';

let bot;

if (isProd) {
  // Production: webhook mode
  bot = new TelegramBot(token, {
    webHook: {
      port: process.env.PORT || 3000
    }
  });
} else {
  // Development: polling mode
  bot = new TelegramBot(token, { polling: true });
}

const initBot = async () => {
  if (isProd) {
    try {
      await bot.setWebHook(`${url}/api/webhook`);
      console.log('Webhook set successfully');
    } catch (error) {
      console.error('Error setting webhook:', error);
    }
  } else {
    console.log('Bot running in polling mode');
  }
};

module.exports = { bot, initBot };
