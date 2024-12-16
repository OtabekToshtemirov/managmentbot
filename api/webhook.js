export default async function handler(req, res) {
    if (req.method === 'POST') {
      try {
        const update = req.body;
        // Bu yerda update'ni qayta ishlash logikasi
        
        res.status(200).json({ ok: true });
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook error' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  }