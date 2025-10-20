import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler';
import { whatsappService } from '../services/whatsappService';
import { db } from '../models/database';

// Cache to prevent duplicate message processing
const recentMessages = new Map<string, boolean>();

const router = Router();

// Multi-Customer: Find which user/customer owns the WhatsApp session for incoming messages
async function findUserForIncomingMessage(phoneNumber: string, webhookPayload: any): Promise<{userId: string, email: string} | null> {
  try {
    // Strategy 1: Try to find user by their linked WhatsApp session
    // WasenderAPI might include session info in webhook payload
    const sessionInfo = webhookPayload?.session || webhookPayload?.sessionId;
    
    if (sessionInfo) {
      console.log(`🔍 Looking for user with session: ${sessionInfo}`);
      const userBySession = await db('users')
        .select('id', 'email')
        .where('wasender_session_id', sessionInfo)
        .first();
      
      if (userBySession) {
        return { userId: userBySession.id, email: userBySession.email };
      }
    }
    
    // Strategy 2: Find user by their registered phone number
    console.log(`🔍 Looking for user with phone: ${phoneNumber}`);
    const userByPhone = await db('users')
      .select('id', 'email')
      .where('phone', phoneNumber)
      .orWhere('phone', `+${phoneNumber}`)
      .first();
    
    if (userByPhone) {
      return { userId: userByPhone.id, email: userByPhone.email };
    }
    
    // Strategy 3: Check if any user has an active WhatsApp session that could receive this message
    // This is for cases where the message comes to a business WhatsApp number
    console.log(`🔍 Looking for users with active WhatsApp sessions`);
    const usersWithSessions = await db('users')
      .select('id', 'email', 'wasender_session_id')
      .whereNotNull('wasender_session_id');
    
    // For now, if we have active sessions but can't determine the exact user,
    // we could route to the first active user or implement more sophisticated logic
    if (usersWithSessions.length === 1) {
      console.log(`🔍 Single user with active session found, routing to them`);
      return { userId: usersWithSessions[0].id, email: usersWithSessions[0].email };
    }
    
    console.log(`🔍 No specific user found for phone ${phoneNumber}`);
    return null;
  } catch (error) {
    console.error('🔍 Error finding user for incoming message:', error);
    return null;
  }
}

function verifySignature(signatureHeader: string | undefined, secret: string | undefined): boolean {
  if (!secret) return true; // if no secret configured, skip verification
  if (!signatureHeader) return false;
  try {
    // WasenderAPI uses simple string comparison (not HMAC)
    return signatureHeader === secret;
  } catch {
    return false;
  }
}

router.post('/wasender', asyncHandler(async (req: Request, res: Response) => {
  console.log('🎣 Webhook received from WasenderAPI:', {
    headers: req.headers,
    body: JSON.stringify(req.body, null, 2)
  });

  const secret = process.env.WASENDER_WEBHOOK_SECRET;
  const signature = req.headers['x-webhook-signature'] as string | undefined;

  // Verify signature if secret is configured
  if (secret) {
    const ok = verifySignature(signature, secret);
    if (!ok) {
      console.log('❌ Webhook signature verification failed');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    console.log('✅ Webhook signature verified');
  }

  const event = req.body?.event;
  const payload = req.body;

  console.log(`🎣 Processing webhook event: ${event}`);
  console.log(`📦 Full webhook payload:`, JSON.stringify(payload, null, 2));

  try {
    if (event === 'messages.received') {
      // Handle WasenderAPI messages.received format
      const data = payload?.data;
      if (data) {
        // Try both possible data structures
        let fromRaw = '';
        let text = '';
        let fromMe = false;
        
        // Structure 1: data.key.remoteJid (old format)
        if (data.key?.remoteJid) {
          fromRaw = data.key.remoteJid;
          text = data.message?.conversation || '';
          fromMe = data.key?.fromMe || false;
        }
        // Structure 2: data.messages.key.remoteJid (new format)
        else if (data.messages?.key?.remoteJid) {
          fromRaw = data.messages.key.remoteJid;
          text = data.messages.message?.conversation || '';
          fromMe = data.messages.key?.fromMe || false;
        }
        
        // Extract phone number (remove @s.whatsapp.net suffix if present)
        const from = fromRaw.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        
        console.log(`📱 Processing message from ${from}: "${text}"`);
        
        // CRITICAL: Ignore messages sent by the bot itself
        if (fromMe) {
          console.log(`🤖 Ignoring message from self (fromMe=true): "${text}"`);
          return res.status(200).json({ received: true, ignored: 'fromMe' });
        }
        
        // Prevent duplicate processing within 10 seconds
        const messageKey = `${from}:${text.substring(0, 50)}:${Math.floor(Date.now() / 10000)}`;
        if (recentMessages.has(messageKey)) {
          console.log(`🔄 Duplicate message detected within 10s, ignoring: "${text.substring(0, 50)}..."`);
          return res.status(200).json({ received: true, ignored: 'duplicate' });
        }
        recentMessages.set(messageKey, true);
        // Cleanup after 15 seconds
        setTimeout(() => recentMessages.delete(messageKey), 15000);
        
        // Additional safety: Ignore empty messages
        if (!text || text.trim().length === 0) {
          console.log(`⚠️ Ignoring empty message from ${from}`);
          return res.status(200).json({ received: true, ignored: 'empty' });
        }
        
        if (from && text) {
          // Multi-Customer: Find which user/customer this message belongs to
          const targetUser = await findUserForIncomingMessage(from, payload);
          
          if (targetUser) {
            console.log(`👤 Message routed to user ${targetUser.userId} (${targetUser.email})`);
            await whatsappService.handleIncomingMessageForUser(targetUser.userId, from, text);
            console.log('✅ Message processed successfully');
          } else {
            console.log('⚠️ No user found for incoming message - using default handling');
            await whatsappService.handleIncomingMessage(from, text);
          }
        } else {
          console.log('⚠️ Missing from or text in message');
          console.log(`🔍 Debug - fromRaw: "${fromRaw}", text: "${text}"`);
          console.log(`🔍 Debug - data structure:`, JSON.stringify(data, null, 2));
        }
      }
    } else {
      console.log(`ℹ️ Ignoring event: ${event}`);
    }
  } catch (e: any) {
    console.error('❌ Webhook processing error:', e);
  }

  // Always return 200 OK quickly
  return res.status(200).json({ received: true });
}));

export default router;


