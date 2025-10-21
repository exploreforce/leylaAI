import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler';
import { whatsappService } from '../services/whatsappService';
import { db } from '../models/database';
import { WasenderApiClient } from '../services/wasenderApiClient';

// Cache to prevent duplicate message processing
const recentMessages = new Map<string, boolean>();

// Cache for session-to-phone mapping (5 minute TTL)
const sessionPhoneCache = new Map<string, { phone: string; expires: number }>();

const router = Router();

// Multi-Customer: Find which user/customer owns the WhatsApp session for incoming messages
async function findUserForIncomingMessage(
  customerPhone: string,      // The customer's phone number (sender)
  businessPhone: string | null, // The business phone number that received the message
  webhookPayload: any
): Promise<{userId: string, email: string} | null> {
  try {
    console.log(`🔍 Finding user for message - Customer: ${customerPhone}, Business: ${businessPhone || 'N/A'}`);
    
    // Strategy 1: Try to find user by their linked WhatsApp session
    // WasenderAPI includes session info in webhook payload
    const sessionInfo = webhookPayload?.sessionId || webhookPayload?.session || webhookPayload?.data?.sessionId;
    
    if (sessionInfo) {
      console.log(`🔍 Strategy 1: Looking for user with session: ${sessionInfo}`);
      const userBySession = await db('users')
        .select('id', 'email', 'account_id')
        .where('wasender_session_id', sessionInfo)
        .first();
      
      if (userBySession) {
        console.log(`✅ Strategy 1 SUCCESS: Found user by session - ${userBySession.email} (account: ${userBySession.account_id})`);
        return { userId: userBySession.id, email: userBySession.email };
      }
      console.log(`❌ Strategy 1 FAILED: No user found with session ${sessionInfo}`);
    } else {
      console.log(`⚠️ Strategy 1 SKIPPED: No session info in payload`);
    }
    
    // Strategy 2: Find user by their registered business phone number
    // This is the phone number that RECEIVED the message (the business WhatsApp number)
    if (businessPhone && businessPhone.length > 5) {
      console.log(`🔍 Strategy 2: Looking for user with BUSINESS phone: ${businessPhone}`);
      const userByBusinessPhone = await db('users')
        .select('id', 'email', 'account_id')
        .where('phone', businessPhone)
        .orWhere('phone', `+${businessPhone}`)
        .first();
      
      if (userByBusinessPhone) {
        console.log(`✅ Strategy 2 SUCCESS: Found user by business phone - ${userByBusinessPhone.email} (account: ${userByBusinessPhone.account_id})`);
        return { userId: userByBusinessPhone.id, email: userByBusinessPhone.email };
      }
      console.log(`❌ Strategy 2 FAILED: No user found with business phone ${businessPhone}`);
    } else {
      console.log(`⚠️ Strategy 2 SKIPPED: No business phone available`);
    }
    
    // Strategy 3: Single active session fallback
    // If there's only one user with an active WhatsApp session, route to them
    console.log(`🔍 Strategy 3: Looking for single user with active WhatsApp session`);
    const usersWithSessions = await db('users')
      .select('id', 'email', 'account_id', 'wasender_session_id')
      .whereNotNull('wasender_session_id');
    
    if (usersWithSessions.length === 1) {
      console.log(`✅ Strategy 3 SUCCESS: Single user with active session found - ${usersWithSessions[0].email} (account: ${usersWithSessions[0].account_id})`);
      return { userId: usersWithSessions[0].id, email: usersWithSessions[0].email };
    } else if (usersWithSessions.length > 1) {
      console.log(`❌ Strategy 3 FAILED: Multiple users with sessions (${usersWithSessions.length}) - cannot determine which one`);
      console.log(`   Users with sessions:`, usersWithSessions.map(u => `${u.email} (session: ${u.wasender_session_id})`));
    } else {
      console.log(`❌ Strategy 3 FAILED: No users with active sessions found`);
    }
    
    // Strategy 4: TEMPORARY FALLBACK to Susi account for testing
    console.log(`🔍 Strategy 4 (TEMPORARY): Fallback to Susi account for testing`);
    const susiUser = await db('users')
      .select('id', 'email')
      .where('account_id', '110dd6ca-a961-4df0-b4c1-57648c926dc4')
      .first();
    
    if (susiUser) {
      console.log(`✅ Strategy 4 SUCCESS: Routing to Susi account - ${susiUser.email}`);
      return { userId: susiUser.id, email: susiUser.email };
    }
    
    console.log(`❌ ALL STRATEGIES FAILED: No user found for customer ${customerPhone}, business ${businessPhone}`);
    return null;
  } catch (error) {
    console.error('🔍 Error finding user for incoming message:', error);
    return null;
  }
}

async function getBusinessPhoneForSession(sessionId: string): Promise<string | null> {
  if (!sessionId) return null;
  
  try {
    // Check cache first
    const cached = sessionPhoneCache.get(sessionId);
    if (cached && cached.expires > Date.now()) {
      console.log(`🔍 Using cached phone for session ${sessionId}: ${cached.phone}`);
      return cached.phone;
    }
    
    // Fetch from WasenderAPI
    console.log(`🔍 Fetching business phone for session ${sessionId} from WasenderAPI...`);
    const phone = await WasenderApiClient.getSessionPhone(sessionId);
    
    if (phone) {
      // Cache for 5 minutes
      sessionPhoneCache.set(sessionId, {
        phone,
        expires: Date.now() + (5 * 60 * 1000)
      });
      console.log(`✅ Found business phone for session ${sessionId}: ${phone}`);
      return phone;
    }
    
    console.log(`⚠️ No phone number found for session ${sessionId}`);
    return null;
  } catch (error) {
    console.error(`❌ Error getting business phone for session ${sessionId}:`, error);
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
        let toRaw = '';
        let text = '';
        let fromMe = false;
        
        // Structure 1: data.key.remoteJid (old format)
        if (data.key?.remoteJid) {
          fromRaw = data.key.remoteJid;
          text = data.message?.conversation || '';
          fromMe = data.key?.fromMe || false;
          // Try to get the business phone that received the message
          toRaw = data.to || data.businessPhone || data.me || '';
        }
        // Structure 2: data.messages.key.remoteJid (new format)
        else if (data.messages?.key?.remoteJid) {
          fromRaw = data.messages.key.remoteJid;
          text = data.messages.message?.conversation || '';
          fromMe = data.messages.key?.fromMe || false;
          // Try to get the business phone that received the message
          toRaw = data.messages.to || data.to || data.businessPhone || data.me || '';
        }
        
        // Extract phone numbers (remove @s.whatsapp.net suffix if present)
        const from = fromRaw.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        let to = toRaw ? toRaw.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '') : null;
        
        // If business phone not in webhook payload, look it up via sessionId
        if (!to && payload?.sessionId) {
          console.log(`🔍 Business phone not in payload, looking up via sessionId...`);
          to = await getBusinessPhoneForSession(payload.sessionId);
        }
        
        console.log(`📱 Processing message - FROM (customer): ${from}, TO (business): ${to || 'unknown'}, TEXT: "${text}"`);
        
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
          // Pass BOTH the customer phone (from) AND business phone (to)
          const targetUser = await findUserForIncomingMessage(from, to, payload);
          
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
          console.log(`🔍 Debug - fromRaw: "${fromRaw}", toRaw: "${toRaw}", text: "${text}"`);
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

// TEMPORARY: One-time webhook setup endpoint (remove after first use!)
// This endpoint configures webhooks for all existing WasenderAPI sessions
router.post('/setup', asyncHandler(async (req: Request, res: Response) => {
  const { secret } = req.body;
  
  // Simple security: require a secret key from environment or request
  const expectedSecret = process.env.WEBHOOK_SETUP_SECRET || 'setup-webhooks-2025';
  if (secret !== expectedSecret) {
    console.log('⚠️ Webhook setup attempted with invalid secret');
    return res.status(403).json({ error: 'Invalid secret key' });
  }
  
  try {
    console.log('🔧 Manual webhook setup triggered');
    
    // Get webhook URL from environment
    const webhookUrl = process.env.WASENDER_WEBHOOK_URL || 
                       'https://wnn8pretct.eu-central-1.awsapprunner.com/api/webhooks/wasender';
    
    console.log(`🔗 Configuring webhook URL: ${webhookUrl}`);
    
    // Get all sessions from WasenderAPI
    const sessions = await WasenderApiClient.listSessions();
    console.log(`📋 Found ${sessions.length} sessions to configure`);
    
    const results = [];
    
    for (const session of sessions) {
      const sessionId = session.id || session.whatsappSession || session.sessionId;
      const sessionName = session.name || 'Unnamed';
      const sessionPhone = session.phone_number || session.phoneNumber || 'Unknown';
      
      if (!sessionId) {
        console.log(`⚠️ Skipping session without ID`);
        continue;
      }
      
      try {
        console.log(`🔧 Configuring webhook for session ${sessionId} (${sessionName} - ${sessionPhone})...`);
        await WasenderApiClient.updateSessionWebhook(sessionId, webhookUrl);
        
        results.push({
          sessionId,
          name: sessionName,
          phone: sessionPhone,
          status: 'success'
        });
        
        console.log(`✅ Webhook configured successfully for ${sessionId}`);
      } catch (error: any) {
        console.error(`❌ Failed to configure webhook for session ${sessionId}:`, error.message);
        results.push({
          sessionId,
          name: sessionName,
          phone: sessionPhone,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;
    
    console.log(`✅ Webhook setup completed: ${successCount} successful, ${failCount} failed`);
    
    return res.json({ 
      success: true, 
      message: `Webhooks configured for ${successCount} out of ${sessions.length} sessions`,
      webhookUrl,
      results,
      summary: {
        total: sessions.length,
        successful: successCount,
        failed: failCount
      }
    });
  } catch (error: any) {
    console.error('🔧 Webhook setup failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to setup webhooks',
      details: error.toString()
    });
  }
}));

export default router;


