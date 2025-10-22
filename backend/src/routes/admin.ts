import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { WasenderApiClient } from '../services/wasenderApiClient';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

// Admin endpoint to setup webhooks for all existing sessions
router.post('/setup-webhooks', requireAdmin as any, asyncHandler(async (req: any, res: Response) => {
  const userId = req.userId;
  
  console.log(`🔧 Admin webhook setup requested by user ${userId}`);
  
  try {
    await WasenderApiClient.ensureWebhooksForAllSessions();
    return res.json({ 
      success: true, 
      message: 'Webhooks have been configured for all existing sessions' 
    });
  } catch (error: any) {
    console.error('🔧 Admin webhook setup failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to setup webhooks' 
    });
  }
}));

// Admin endpoint to get webhook configuration status for all sessions
router.get('/webhook-status', requireAdmin as any, asyncHandler(async (req: any, res: Response) => {
  const userId = req.userId;
  
  console.log(`🔧 Webhook status requested by user ${userId}`);
  
  try {
    const sessions = await WasenderApiClient.listSessions();
    const webhookUrl = process.env.WASENDER_WEBHOOK_URL;
    
    const sessionStatus = sessions.map(session => ({
      id: session.id || session.whatsappSession || session.sessionId,
      name: session.name,
      phone: session.phone_number,
      status: session.status,
      webhookConfigured: Boolean(session.webhook_enabled && session.webhook_url),
      webhookUrl: session.webhook_url,
      expectedWebhookUrl: webhookUrl
    }));
    
    return res.json({ 
      success: true, 
      data: {
        totalSessions: sessions.length,
        configuredWebhookUrl: webhookUrl,
        sessions: sessionStatus
      }
    });
  } catch (error: any) {
    console.error('🔧 Webhook status check failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to check webhook status' 
    });
  }
}));

export default router;
