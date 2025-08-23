import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { whatsappService } from '../services/whatsappService';

const router = Router();

// Webhook verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Message handling
router.post('/webhook', (req, res) => {
  const body = req.body;

  console.log(JSON.stringify(body, null, 2));

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const from = body.entry[0].changes[0].value.messages[0].from;
      const msg_body = body.entry[0].changes[0].value.messages[0].text.body;
      
      whatsappService.handleIncomingMessage(from, msg_body);
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

export default router; 