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
    const fallback = await WasenderApiClient.getStatus();
    // Try to include user's stored phone for a stable display
    let userPhone: string | undefined;
    try { const u = await db('users').select('phone').where({ id: userId }).first(); userPhone = u?.phone; } catch {}
    const meNumber = fallback.meNumber || userPhone || null;
    return res.json({ success: true, data: { ...fallback, meNumber, sessionId: null } });
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

export default router; 