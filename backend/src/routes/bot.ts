import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Database } from '../models/database';
import { whatsappService } from '../services/whatsappService';
import { ChatMessage } from '../types';
import db from '../models/database';

const router = Router();

// Get bot configuration
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🔍 Bot API: Getting bot configuration...');
    const config = await Database.getBotConfig();
    console.log('🔍 Bot API: Bot config retrieved:', {
      hasConfig: !!config,
      configId: config?.id,
      configData: config ? 'Present' : 'Missing'
    });
    
    res.json({
      success: true,
      message: 'Bot configuration retrieved',
      data: config,
    });
  })
);

// Approve last draft (Test flow only)
router.post(
  '/test-chat/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    // In real WhatsApp flow, we would pass the recipient phone; for test we just mark last assistant msg as sent
    const dbModule = await import('../models/database');
    const rows = await dbModule.db('chat_messages')
      .where('session_id', parseInt(sessionId, 10))
      .orderBy('timestamp', 'desc');
    const candidate = rows.find((m: any) => m.role === 'assistant');
    if (!candidate) return res.json({ success: false, message: 'No assistant message found' });
    let metadata: any = candidate.metadata;
    try {
      if (typeof metadata === 'string') metadata = JSON.parse(metadata);
    } catch {}
    metadata = { ...(metadata || {}), status: 'approved', approved: true };
    await dbModule.db('chat_messages')
      .where('id', candidate.id)
      .update({ metadata: JSON.stringify(metadata) });
    return res.json({ success: true });
  })
);

// Force send edited assistant content (Test flow)
router.post(
  '/test-chat/send',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, content } = req.body as { sessionId: string; content: string };
    if (!sessionId || !content) return res.status(400).json({ error: 'sessionId and content required' });
    const rows = await db('chat_messages')
      .where('session_id', parseInt(sessionId, 10))
      .orderBy('timestamp', 'desc');
    const candidate = rows.find((m: any) => m.role === 'assistant');
    if (!candidate) return res.json({ success: false, message: 'No assistant message found' });
    let metadata: any = candidate.metadata;
    try { if (typeof metadata === 'string') metadata = JSON.parse(metadata); } catch {}
    metadata = { ...(metadata || {}), status: 'approved', approved: true, isCustomReply: true };
    await db('chat_messages')
      .where('id', candidate.id)
      .update({
        content,
        metadata: JSON.stringify(metadata)
      });
    return res.json({ success: true });
  })
);

// Get messages for a session (Test flow)
router.get(
  '/test-chat/messages',
  asyncHandler(async (req: Request, res: Response) => {
    const sessionId = String(req.query.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const rows = await db('chat_messages')
      .where('session_id', parseInt(sessionId, 10))
      .orderBy('timestamp', 'asc');
    // Parse metadata if string
    const messages = rows.map((r: any) => {
      let metadata = r.metadata;
      try { if (typeof metadata === 'string') metadata = JSON.parse(metadata); } catch {}
      return {
        id: r.id,
        role: r.role,
        content: r.content,
        timestamp: r.timestamp,
        metadata
      };
    });
    return res.json({ data: messages });
  })
);

// Update bot configuration
router.put(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const updatedConfig = await Database.updateBotConfig(req.body);
    res.json({
      success: true,
      message: 'Bot configuration updated',
      data: updatedConfig,
    });
  })
);

// Test chat endpoint - verwendet identische Logik wie WhatsApp Chat
router.post(
  '/test-chat',
  asyncHandler(async (req: Request, res: Response) => {
    const { messages, sessionId, targetLanguage } = req.body as {
      messages: ChatMessage[];
      sessionId: string;
      targetLanguage?: string;
    };

    console.log('🔵 Test chat request:', { sessionId, messagesCount: messages?.length });

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    // Get the last user message
    const userMessage = messages[messages.length - 1];
    
    if (userMessage.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' });
    }

    console.log('📝 Processing user message:', { sessionId, content: userMessage.content });

    // Use identical logic as WhatsApp chat (but without sending to WhatsApp)
    // Language detection is now handled automatically by structured outputs in AIService
    const aiResponse = await whatsappService.handleTestMessage(sessionId, userMessage.content);
    
    // Update session activity
    await Database.updateChatSessionActivity(sessionId);

    if (!aiResponse) {
      return res.status(500).json({ error: 'Failed to generate AI response' });
    }

    console.log(`✅ Test Chat: Response completed for session ${sessionId}`);
    return res.json({
      data: {
        response: aiResponse,
      }
    });
  })
);

// Create new test chat session (always creates new session)
router.post(
  '/test-chat/session',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🔵 Creating new test chat session...');
    
    // Always create a new session (no longer reusing existing sessions)
    const session = await Database.createTestChatSession();
    console.log('📝 New session created:', JSON.stringify(session, null, 2));
    
    const responseData = {
      message: 'New test chat session created',
      data: session,
    };
    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));
    
    return res.status(201).json(responseData);
  })
);

// Get existing test chat session with messages
router.get(
  '/test-chat/session/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    // console.log('🔍 Getting test chat session:', sessionId); // Reduced polling spam
    
    try {
      // Get session info
      const session = await db('test_chat_sessions')
        .where('id', parseInt(sessionId, 10))
        .first();
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Load messages
      const messages = await db('chat_messages')
        .where('session_id', parseInt(sessionId, 10))
        .orderBy('timestamp', 'asc');
      
      // Parse metadata if string
      const parsedMessages = messages.map((r: any) => {
        let metadata = r.metadata;
        try { if (typeof metadata === 'string') metadata = JSON.parse(metadata); } catch {}
        return {
          id: r.id,
          role: r.role,
          content: r.content,
          timestamp: r.timestamp,
          metadata
        };
      });
      
      const transformedSession = {
        id: String(session.id),
        messages: parsedMessages,
        createdAt: session.created_at ? new Date(session.created_at).toISOString() : new Date().toISOString(),
        lastActivity: session.last_activity ? new Date(session.last_activity).toISOString() : 
                     session.updated_at ? new Date(session.updated_at).toISOString() : new Date().toISOString()
      };
      
      return res.json({ data: transformedSession });
    } catch (error) {
      console.error('Error getting session:', error);
      return res.status(500).json({ error: 'Failed to get session' });
    }
  })
);

// Get all chats with pending reviews (WhatsApp + Test Chat)
router.get(
  '/chats/review',
  asyncHandler(async (req: Request, res: Response) => {
    // console.log('🔍 Getting all chats for review...'); // Reduced polling spam
    
    try {
      const chats = [];
      
      // Get Test Chat sessions with pending drafts
      // Needs Review only for flagged drafts
      const testSessions = await db('test_chat_sessions')
        .select('test_chat_sessions.*')
        .leftJoin('chat_messages', 'test_chat_sessions.id', 'chat_messages.session_id')
        .whereRaw(`chat_messages.role = 'assistant' AND chat_messages.metadata LIKE '%"status":"draft"%' AND (chat_messages.metadata LIKE '%"isFlagged":true%' OR chat_messages.metadata LIKE '%"is_flagged":true%')`)
        .groupBy('test_chat_sessions.id')
        .orderBy('test_chat_sessions.last_activity', 'desc');
      
      for (const session of testSessions) {
        // Get latest user message and pending AI response
        const messages = await db('chat_messages')
          .where('session_id', session.id)
          .orderBy('timestamp', 'desc')
          .limit(2);
        
        if (messages.length >= 2) {
          const aiMessage = messages[0];
          const userMessage = messages[1];
          
          // Check if AI message is draft
          let metadata = aiMessage.metadata;
          try { if (typeof metadata === 'string') metadata = JSON.parse(metadata); } catch {}
          
          if (metadata?.status === 'draft' || aiMessage.role === 'assistant') {
            chats.push({
              id: `test-${session.id}`,
              type: 'test',
              title: 'Test Chat',
              lastUserMessage: userMessage.content,
              pendingReply: aiMessage.content,
              timestamp: session.last_activity || session.updated_at,
              sessionId: session.id
            });
          }
        }
      }
      
      // TODO: Add WhatsApp chats here when implemented
      // const whatsappChats = await getWhatsAppChatsWithPendingReplies();
      // chats.push(...whatsappChats);
      
      console.log('📋 Found', chats.length, 'chats with pending reviews');
      return res.json({ data: chats });
    } catch (error) {
      console.error('Error getting chats for review:', error);
      return res.status(500).json({ error: 'Failed to get chats' });
    }
  })
);

// Get specific chat for review with full message history
router.get(
  '/chats/review/:chatId',
  asyncHandler(async (req: Request, res: Response) => {
    const { chatId } = req.params;
    console.log('🔍 Getting chat for review:', chatId);
    
    try {
      if (chatId.startsWith('test-')) {
        const sessionId = chatId.replace('test-', '');
        
        // Get all messages for this test session
        const messages = await db('chat_messages')
          .where('session_id', parseInt(sessionId, 10))
          .orderBy('timestamp', 'asc');
        
        const parsedMessages = messages.map((r: any) => {
          let metadata = r.metadata;
          try { if (typeof metadata === 'string') metadata = JSON.parse(metadata); } catch {}
          return {
            id: r.id,
            role: r.role,
            content: r.content,
            timestamp: r.timestamp,
            metadata
          };
        });
        
        // Find the last user message and pending AI reply
        const userMessages = parsedMessages.filter(m => m.role === 'user');
        const aiMessages = parsedMessages.filter(m => m.role === 'assistant');
        const lastUserMessage = userMessages[userMessages.length - 1];
        const pendingReply = aiMessages.find(m => m.metadata?.status === 'draft') || aiMessages[aiMessages.length - 1];
        
        return res.json({
          data: {
            id: chatId,
            type: 'test',
            title: 'Test Chat',
            messages: parsedMessages,
            lastUserMessage: lastUserMessage?.content || '',
            pendingReply: pendingReply?.content || '',
            pendingReplyId: pendingReply?.id,
            sessionId: parseInt(sessionId, 10)
          }
        });
      }
      
      // TODO: Handle WhatsApp chats
      return res.status(404).json({ error: 'Chat not found' });
    } catch (error) {
      console.error('Error getting chat for review:', error);
      return res.status(500).json({ error: 'Failed to get chat' });
    }
  })
);

// Helper function to assign session numbers
const assignSessionNumbers = async () => {
  const sessionsWithoutNumbers = await db('test_chat_sessions')
    .where('session_number', null)
    .orderBy('created_at', 'asc');
  
  if (sessionsWithoutNumbers.length > 0) {
    // Find the highest existing session number
    const maxNumber = await db('test_chat_sessions')
      .max('session_number as maxNum')
      .first();
    
    let nextNumber = (maxNumber?.maxNum || 0) + 1;
    
    for (const session of sessionsWithoutNumbers) {
      await db('test_chat_sessions')
        .where('id', session.id)
        .update({ session_number: nextNumber });
      nextNumber++;
    }
  }
};

// Helper function to update session status based on inactivity
const updateInactiveStatus = async () => {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  await db('test_chat_sessions')
    .where('last_activity', '<', twoWeeksAgo)
    .where('status', 'active')
    .update({ status: 'inactive' });
};

// Get all test chat sessions with stats
router.get(
  '/test-chat/sessions',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🔍 Getting all test chat sessions...');
    
    try {
      // Assign session numbers and update inactive status
      await assignSessionNumbers();
      await updateInactiveStatus();
      
      const sessions = await db('test_chat_sessions')
        .orderBy('last_activity', 'desc');
      
      const sessionsWithStats = await Promise.all(sessions.map(async (session: any) => {
        // Get message counts
        const messageStats = await db('chat_messages')
          .where('session_id', session.id)
          .select(
            db.raw('COUNT(*) as total_messages'),
            db.raw('COUNT(CASE WHEN role = "user" THEN 1 END) as user_messages'),
            db.raw('COUNT(CASE WHEN role = "assistant" THEN 1 END) as assistant_messages'),
            db.raw('COUNT(CASE WHEN role = "assistant" AND metadata LIKE \'%"status":"draft"%\' THEN 1 END) as draft_messages')
          )
          .first();
        
        // Get last message
        const lastMessage = await db('chat_messages')
          .where('session_id', session.id)
          .orderBy('timestamp', 'desc')
          .first();

        // Get last assistant message to determine flagged state
        const lastAssistantMsg = await db('chat_messages')
          .where('session_id', session.id)
          .andWhere('role', 'assistant')
          .orderBy('timestamp', 'desc')
          .first();
        let isFlagged = false;
        if (lastAssistantMsg) {
          let meta: any = lastAssistantMsg.metadata;
          try { if (typeof meta === 'string') meta = JSON.parse(meta); } catch {}
          isFlagged = Boolean(meta?.isFlagged ?? meta?.is_flagged);
        }
        
        return {
          id: String(session.id),
          sessionNumber: session.session_number,
          status: session.status || 'active',
          createdAt: session.created_at ? new Date(session.created_at).toISOString() : new Date().toISOString(),
          lastActivity: session.last_activity ? new Date(session.last_activity).toISOString() : 
                       session.updated_at ? new Date(session.updated_at).toISOString() : new Date().toISOString(),
          isFlagged,
          stats: {
            totalMessages: parseInt(messageStats?.total_messages || '0'),
            userMessages: parseInt(messageStats?.user_messages || '0'),
            assistantMessages: parseInt(messageStats?.assistant_messages || '0'),
            draftMessages: parseInt(messageStats?.draft_messages || '0')
          },
          lastMessage: lastMessage ? {
            role: lastMessage.role,
            content: lastMessage.content?.substring(0, 100) + (lastMessage.content?.length > 100 ? '...' : ''),
            timestamp: lastMessage.timestamp
          } : null
        };
      }));
      
      console.log('📋 Found', sessionsWithStats.length, 'test chat sessions');
      return res.json({ data: sessionsWithStats });
    } catch (error) {
      console.error('Error getting test chat sessions:', error);
      return res.status(500).json({ error: 'Failed to get sessions' });
    }
  })
);

// Delete test chat session
router.delete(
  '/test-chat/sessions/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    console.log('🗑️ Deleting test chat session:', sessionId);
    
    try {
      // Get session info first to free up the session number
      const session = await db('test_chat_sessions')
        .where('id', parseInt(sessionId, 10))
        .first();
        
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Delete all messages for this session first
      await db('chat_messages')
        .where('session_id', parseInt(sessionId, 10))
        .del();
      
      // Delete the session
      const deletedCount = await db('test_chat_sessions')
        .where('id', parseInt(sessionId, 10))
        .del();
      
      // The session number becomes available for reuse (handled automatically by assignSessionNumbers)
      
      console.log('✅ Session deleted successfully');
      return res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
      console.error('Error deleting session:', error);
      return res.status(500).json({ error: 'Failed to delete session' });
    }
  })
);

// Archive/Unarchive test chat session
router.patch(
  '/test-chat/sessions/:sessionId/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'archived', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, archived, or inactive' });
    }
    
    console.log(`📝 Updating session ${sessionId} status to:`, status);
    
    try {
      const updatedCount = await db('test_chat_sessions')
        .where('id', parseInt(sessionId, 10))
        .update({ status: status });
      
      if (updatedCount === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      console.log('✅ Session status updated successfully');
      return res.json({ success: true, message: `Session ${status === 'archived' ? 'archived' : status === 'active' ? 'activated' : 'set to inactive'} successfully` });
    } catch (error) {
      console.error('Error updating session status:', error);
      return res.status(500).json({ error: 'Failed to update session status' });
    }
  })
);

// Debug: Check/Create availability configuration
router.post(
  '/debug/availability-config',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🔧 Debug: Checking availability configuration...');
    
    try {
      let config = await Database.getAvailabilityConfig();
      
      if (!config) {
        console.log('❌ No config found, creating default...');
        
        const defaultWeeklySchedule = {
          monday: { dayOfWeek: 1, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          tuesday: { dayOfWeek: 2, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          wednesday: { dayOfWeek: 3, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          thursday: { dayOfWeek: 4, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          friday: { dayOfWeek: 5, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          saturday: { dayOfWeek: 6, isAvailable: false, timeSlots: [] },
          sunday: { dayOfWeek: 0, isAvailable: false, timeSlots: [] }
        };
        
        config = await Database.updateAvailabilityConfig(defaultWeeklySchedule);
        console.log('✅ Default config created');
      }
      
      return res.json({
        success: true,
        config: config,
        message: 'Availability configuration ready'
      });
    } catch (error) {
      console.error('❌ Error with availability config:', error);
      return res.status(500).json({ error: 'Failed to setup availability config' });
    }
  })
);

// Language Settings API
// Get all available languages
router.get(
  '/languages',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🌍 Getting available languages...');
    
    try {
      const languages = await db('language_settings')
        .select('*')
        .orderBy('language_name', 'asc');
      
      console.log('✅ Found', languages.length, 'languages');
      return res.json({
        success: true,
        data: languages,
        message: 'Available languages retrieved'
      });
    } catch (error) {
      console.error('❌ Error getting languages:', error);
      return res.status(500).json({ error: 'Failed to get languages' });
    }
  })
);

// Get current language setting
router.get(
  '/language-setting',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🌍 Getting current language setting...');
    
    try {
      const currentLanguage = await db('language_settings')
        .where('is_default', true)
        .first();
      
      if (!currentLanguage) {
        // Set German as default if none set
        await db('language_settings')
          .where('language_code', 'de')
          .update({ is_default: true });
        
        const defaultLanguage = await db('language_settings')
          .where('language_code', 'de')
          .first();
          
        return res.json({
          success: true,
          data: defaultLanguage,
          message: 'Default language set to German'
        });
      }
      
      console.log('✅ Current language:', currentLanguage.language_name);
      return res.json({
        success: true,
        data: currentLanguage,
        message: 'Current language setting retrieved'
      });
    } catch (error) {
      console.error('❌ Error getting current language:', error);
      return res.status(500).json({ error: 'Failed to get current language' });
    }
  })
);

// Update language setting
router.put(
  '/language-setting',
  asyncHandler(async (req: Request, res: Response) => {
    const { language_code } = req.body;
    
    if (!language_code) {
      return res.status(400).json({ error: 'Language code is required' });
    }
    
    console.log('🌍 Updating language setting to:', language_code);
    
    try {
      // Check if the language exists
      const language = await db('language_settings')
        .where('language_code', language_code)
        .first();
      
      if (!language) {
        return res.status(404).json({ error: 'Language not found' });
      }
      
      // Reset all languages to not default
      await db('language_settings')
        .update({ is_default: false });
      
      // Set the new default language
      await db('language_settings')
        .where('language_code', language_code)
        .update({ is_default: true });
      
      const updatedLanguage = await db('language_settings')
        .where('language_code', language_code)
        .first();
      
      console.log('✅ Language setting updated to:', updatedLanguage.language_name);
      return res.json({
        success: true,
        data: updatedLanguage,
        message: `Language setting updated to ${updatedLanguage.language_name}`
      });
    } catch (error) {
      console.error('❌ Error updating language setting:', error);
      return res.status(500).json({ error: 'Failed to update language setting' });
    }
  })
);

export default router; 