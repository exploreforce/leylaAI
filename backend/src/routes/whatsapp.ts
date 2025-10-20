import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { WasenderApiClient } from '../services/wasenderApiClient';
import { requireAuth } from '../middleware/auth';
import { Database, db } from '../models/database';

const router = Router();

// REMOVED: Global status endpoint - use user-specific /user/status instead

// REMOVED: Global QR endpoint - use user-specific /user/qr instead

// Send a test message
router.post('/send', asyncHandler(async (req: Request, res: Response) => {
  const { to, message } = req.body as { to: string; message: string };
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'to and message required' });
  }
  await WasenderApiClient.sendTextMessage(to, message);
  return res.json({ success: true });
}));

// Authenticated, per-user session management
router.post('/user/session/ensure', requireAuth as any, asyncHandler(async (req: any, res: Response) => {
  const userId: string | undefined = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const bodyPhone: string | undefined = (req.body?.phoneNumber || req.body?.phone || '').toString().trim() || undefined;
  let sessionId = await Database.getUserWasenderSessionId(userId);
  if (!sessionId) {
    // Create new session for this user
    // If Wasender requires a phone number on session creation, pass user's stored phone (if available)
    let userPhone: string | undefined;
    try {
      const u = await db('users').select('phone').where({ id: userId }).first();
      userPhone = u?.phone;
    } catch {}
    const phoneToUse = bodyPhone || userPhone;
    if (!phoneToUse) {
      return res.status(400).json({ success: false, error: 'phoneNumber is required to create a session' });
    }
    // persist phone if provided in request
    if (bodyPhone && bodyPhone !== userPhone) {
      try { await db('users').where({ id: userId }).update({ phone: bodyPhone, updated_at: new Date() }); } catch {}
    }
    sessionId = await WasenderApiClient.createSessionForUser(`user-${userId}`, phoneToUse);
    await Database.setUserWasenderSessionId(userId, sessionId);
    // After create, connect to get QR
    try { await WasenderApiClient.connectSession(sessionId); } catch {}
    const info = await WasenderApiClient.getStatusBySessionId(sessionId);
    return res.json({ success: true, data: { sessionId, ...info } });
  } else {
    // If session already exists, just report current status; do not allow changing phone/number here
    const info = await WasenderApiClient.getStatusBySessionId(sessionId);
    // If not ready, we can attempt to connect (non-blocking)
    if (info.status !== 'ready') {
      try { await WasenderApiClient.connectSession(sessionId); } catch {}
    }
    return res.json({ success: true, data: { sessionId, ...info } });
  }
}));

router.get('/user/status', requireAuth as any, asyncHandler(async (req: any, res: Response) => {
  const userId: string | undefined = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const sessionId = await Database.getUserWasenderSessionId(userId);
  if (!sessionId) {
    // DON'T use global fallback that might confuse frontend
    // Return a clear "no session" state instead
    let userPhone: string | undefined;
    try { const u = await db('users').select('phone').where({ id: userId }).first(); userPhone = u?.phone; } catch {}
    return res.json({ 
      success: true, 
      data: { 
        status: 'unknown',
        meNumber: userPhone || null, 
        sessionId: null,
        qrAvailable: false
      } 
    });
  }
  const info = await WasenderApiClient.getStatusBySessionId(sessionId);
  // Add stable meNumber fallback from DB if API doesn't include it
  let userPhone: string | undefined;
  try { const u = await db('users').select('phone').where({ id: userId }).first(); userPhone = u?.phone; } catch {}
  const meNumber = info.meNumber || userPhone || null;
  return res.json({ success: true, data: { ...info, meNumber, sessionId } });
}));

router.get('/user/qr', requireAuth as any, asyncHandler(async (req: any, res: Response) => {
  const userId: string | undefined = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const sessionId = await Database.getUserWasenderSessionId(userId);
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'No session for user. Call /user/session/ensure first.' });
  }
  try { await WasenderApiClient.connectSession(sessionId); } catch {}
  const dataUrl = await WasenderApiClient.getQrDataUrl(sessionId);
  if (!dataUrl) return res.status(404).json({ success: false, error: 'QR not available' });
  return res.json({ success: true, data: { dataUrl } });
}));

// Reset user's Wasender session (forces creation of new session on next ensure call)
router.delete('/user/session', requireAuth as any, asyncHandler(async (req: any, res: Response) => {
  const userId: string | undefined = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const sessionId = await Database.getUserWasenderSessionId(userId);
  
  // If there's a sessionId, try to delete it from WasenderAPI first
  let deletedFromWasender = false;
  if (sessionId) {
    try {
      await WasenderApiClient.deleteSession(sessionId);
      deletedFromWasender = true;
      console.log(`✅ Session ${sessionId} deleted from WasenderAPI`);
    } catch (error) {
      console.error(`⚠️ Could not delete session ${sessionId} from WasenderAPI:`, error);
      // Continue anyway - we still want to clear it from our database
    }
  }
  
  // Clear session ID from database
  await db('users')
    .where({ id: userId })
    .update({ wasender_session_id: null, wasender_session_updated_at: new Date() });
  
  console.log(`🔄 Wasender session reset for user ${userId}. Previous sessionId: ${sessionId}`);
  
  return res.json({ 
    success: true, 
    message: 'Wasender session deleted successfully. Create a new session via /user/session/ensure',
    previousSessionId: sessionId,
    deletedFromWasenderAPI: deletedFromWasender
  });
}));

// TEST: List all sessions to find session IDs
router.get('/test/list-sessions', asyncHandler(async (req: Request, res: Response) => {
  console.log(`🧪 TEST: Listing all WasenderAPI sessions...`);
  
  try {
    const sessions = await WasenderApiClient.listSessions();
    
    return res.json({
      success: true,
      message: `Found ${sessions.length} session(s)`,
      data: {
        sessionCount: sessions.length,
        sessions: sessions.map((s: any) => ({
          sessionId: s.id || s.whatsappSession || s.sessionId,
          name: s.name || s.label || 'Unnamed',
          status: s.status,
          phoneNumber: s.phoneNumber || s.phone_number || s.phone || 'N/A',
          apiKey: s.apiKey || s.api_key ? '✓ Present' : '✗ Missing',
          fullData: s
        }))
      },
      instructions: sessions.length > 0 
        ? 'Use one of the sessionId values above to test message history.'
        : 'No sessions found. Create a session first via the frontend WhatsApp Link page.'
    });
  } catch (error: any) {
    console.error('🧪 TEST ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error listing sessions'
    });
  }
}));

// TEST: Get message history for a session (experimental)
router.get('/test/message-history/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  
  console.log(`🧪 TEST: Attempting to retrieve message history for session ${sessionId}`);
  
  try {
    const messages = await WasenderApiClient.getMessageHistory(sessionId, limit, offset);
    
    if (messages.length > 0) {
      return res.json({
        success: true,
        supported: true,
        message: '✅ WasenderAPI supports message history retrieval!',
        data: {
          sessionId,
          messageCount: messages.length,
          messages,
          limit,
          offset
        }
      });
    } else {
      return res.json({
        success: false,
        supported: false,
        message: '❌ WasenderAPI does not appear to support message history retrieval. Check console logs for details.',
        data: {
          sessionId,
          messageCount: 0,
          messages: [],
          suggestion: 'Use webhooks (messages.received) to store incoming messages in real-time instead.'
        }
      });
    }
  } catch (error: any) {
    console.error('🧪 TEST ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error testing message history endpoint'
    });
  }
}));

// TEST: Get chat list for a session (experimental)
router.get('/test/chat-list/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  console.log(`🧪 TEST: Attempting to retrieve chat list for session ${sessionId}`);
  
  try {
    const chats = await WasenderApiClient.getChatList(sessionId);
    
    if (chats.length > 0) {
      return res.json({
        success: true,
        supported: true,
        message: '✅ WasenderAPI supports chat list retrieval!',
        data: {
          sessionId,
          chatCount: chats.length,
          chats
        }
      });
    } else {
      return res.json({
        success: false,
        supported: false,
        message: '❌ WasenderAPI does not appear to support chat list retrieval. Check console logs for details.',
        data: {
          sessionId,
          chatCount: 0,
          chats: []
        }
      });
    }
  } catch (error: any) {
    console.error('🧪 TEST ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error testing chat list endpoint'
    });
  }
}));

export default router; 