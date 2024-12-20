require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Production (Vercel) environment
const isProd = process.env.NODE_ENV === 'production';
const url = 'https://managmentbot.vercel.app';

let bot;

if (isProd) {
  // Production: webhook mode
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  bot.setWebHook(`${url}/api/webhook`);
} else {
  // Development: polling mode
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
}

const initBot = async () => {
  try {
    if (isProd) {
      console.log('Bot running in webhook mode');
    } else {
      console.log('Bot running in polling mode');
    }
  } catch (error) {
    console.error('Error initializing bot:', error);
  }
};

module.exports = { bot, initBot };
