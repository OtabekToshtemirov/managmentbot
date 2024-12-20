import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { body } = req;
      await bot.handleUpdate(body);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}