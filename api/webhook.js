const { bot } = require('../config/bot');
require('dotenv').config();

module.exports = async function handler(req, res) {
  // Verify if the request is coming from Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { body } = req;
    
    // Handle the update
    await bot.handleUpdate(body);
    
    // Send success response
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}