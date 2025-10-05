import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { WasenderApiClient } from '../services/wasenderApiClient';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Test endpoint to check database connection (NO AUTH for debugging)
router.get('/test-db', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { db } = require('../models/database');
    
    // Test database connection
    await db.raw('SELECT 1');
    
    // Try to count tables
    let tableCount = 0;
    try {
      const tables = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
      tableCount = tables.rows?.length || 0;
    } catch {}
    
    return res.json({ 
      success: true,
      message: 'Database connection successful',
      environment: process.env.NODE_ENV,
      hasDatabase: true,
      tableCount
    });
  } catch (error: any) {
    return res.status(500).json({ 
      success: false,
      error: error.message,
      environment: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDbHost: !!process.env.DB_HOST
    });
  }
}));

// Admin endpoint to setup webhooks for all existing sessions
router.post('/setup-webhooks', requireAuth as any, asyncHandler(async (req: any, res: Response) => {
  const userId = req.userId;
  
  // TODO: Add proper admin role check
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
router.get('/webhook-status', requireAuth as any, asyncHandler(async (req: any, res: Response) => {
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
