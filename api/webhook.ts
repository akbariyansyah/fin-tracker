import { handleUpdate, botInstance } from '..';

export default async function handler(req, res) {
  // Set the webhook on first run or if URL changed
  const url = `https://${process.env.VERCEL_URL}/api/webhook`;
  const info = await botInstance.telegram.getWebhookInfo();

  if (info.url !== url) {
    await botInstance.telegram.deleteWebhook();
    await botInstance.telegram.setWebhook(url);
    console.log('Webhook set to', url);
  }

  if (req.method === 'POST') {
    await handleUpdate(req.body, res);
  } else {
    res.status(200).send('Bot is live!');
  }
}
