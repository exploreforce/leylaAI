import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { whatsappWebClient } from '../services/whatsappWebClient';

const router = Router();

// Status of whatsapp-web client
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const info = whatsappWebClient.getStatus();
  return res.json({ success: true, data: info });
}));

// Current QR code as Data URL (only available during scanning)
router.get('/qr', asyncHandler(async (req: Request, res: Response) => {
  const dataUrl = await whatsappWebClient.getQrDataUrl();
  if (!dataUrl) {
    return res.status(404).json({ success: false, error: 'QR not available' });
  }
  return res.json({ success: true, data: { dataUrl } });
}));

// Send a test message
router.post('/send', asyncHandler(async (req: Request, res: Response) => {
  const { to, message } = req.body as { to: string; message: string };
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'to and message required' });
  }
  await whatsappWebClient.sendMessage(to, message);
  return res.json({ success: true });
}));

export default router; 