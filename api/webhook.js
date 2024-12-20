const TelegramBot = require('node-telegram-bot-api');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
      
      // Process the update
      const { body } = req;
      await bot.processUpdate(body);
      
      res.status(200).json({ ok: true });
    } else {
      res.status(200).json({ status: 'webhook is active' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};