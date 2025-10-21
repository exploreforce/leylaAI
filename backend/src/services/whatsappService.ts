import { Database } from '../models/database';
import { AIService } from './aiService';
import { TestChatSession, ChatMessage, DbChatMessage } from '../types';
import { TypingDelayService } from '../utils/typingDelay';
import { WasenderApiClient } from './wasenderApiClient';

class WhatsAppService {
  /**
   * Sendet "typing"-Indikator an WhatsApp (falls verfügbar)
   */
  private async sendTypingIndicator(to: string): Promise<void> {
    // Not supported directly by whatsapp-web.js; no-op for now
    return;
  }

  // DEPRECATED: Use findOrCreateSessionForUser instead which properly includes accountId
  async findOrCreateSession(phoneNumber: string): Promise<TestChatSession> {
    console.warn('⚠️ DEPRECATED: findOrCreateSession called without accountId - this should not be used');
    throw new Error('findOrCreateSession is deprecated. Use findOrCreateSessionForUser with userId/accountId instead.');
  }

  async getMessageHistory(sessionId: string): Promise<ChatMessage[]> {
    const messages = await Database.getChatMessages(sessionId);
    console.log(`📋 Message History for session ${sessionId}:`, {
      totalMessages: messages.length,
      messageRoles: messages.map(m => `${m.role}(${m.content?.substring(0, 30)}...)`),
      assistantMessages: messages.filter(m => m.role === 'assistant').map(m => ({
        content: m.content?.substring(0, 50) + '...',
        status: (m.metadata as any)?.status
      }))
    });
    return messages;
  }

  async sendMessage(to: string, message: string): Promise<void> {
    // Apply realistic typing delay before sending to WhatsApp (not for Test Chat)
    await TypingDelayService.applyTypingDelay(message, `WhatsApp (${to})`);
    
    await WasenderApiClient.sendTextMessage(to, message);
    console.log(`WhatsApp message sent to ${to}`);
  }

  /**
   * Gemeinsame Logik für Nachrichtenverarbeitung (WhatsApp und Test Chat)
   * @param sessionId Session ID
   * @param messageBody User Nachrichteninhalt
   * @param context Kontext für Logging (z.B. "WhatsApp (+49123456789)" oder "Test Chat (abc123)")
   * @param sendToWhatsApp Ob die Nachricht tatsächlich über WhatsApp gesendet werden soll
   * @param whatsappRecipient WhatsApp Empfänger (nur wenn sendToWhatsApp = true)
   */
  private async processMessage(
    sessionId: string, 
    messageBody: string, 
    context: string, 
    sendToWhatsApp: boolean = false,
    whatsappRecipient?: string,
    preferredLanguage?: string
  ): Promise<ChatMessage | null> {
    // User Nachricht speichern
    const userMessageData: DbChatMessage = {
      session_id: sessionId,
      role: 'user',
      content: messageBody,
      timestamp: new Date(),
    };
    await Database.addChatMessage(userMessageData);

    const messageHistory = await this.getMessageHistory(sessionId);

    console.log(`🤖 ${context}: Generating AI response...`);
    if (preferredLanguage) {
      console.log(`🎨 User's preferred UI language: ${preferredLanguage}`);
    }
    const aiResponse = await AIService.getChatResponse(messageHistory, sessionId, preferredLanguage);

    if (aiResponse.content) {
      // Get accountId from session to load correct bot config
      const session = await db('test_chat_sessions')
        .where('id', parseInt(sessionId, 10))
        .first();
      const accountId = session?.account_id || '';
      
      // Load bot config to determine message review mode
      const botConfig = await Database.getBotConfig(accountId);
      const messageReviewMode = botConfig?.messageReviewMode || 'never';
      
      const isFlagged = Boolean((aiResponse as any)?.metadata?.isFlagged);
      const baseMetadata: any = { ...(aiResponse.metadata || {}) };

      // Determine if message needs review
      let needsReview = false;
      if (messageReviewMode === 'always') {
        needsReview = true;
        console.log('🔍 Message review mode: ALWAYS - Saving as draft for review');
      } else if (messageReviewMode === 'on_redflag' && isFlagged) {
        needsReview = true;
        console.log('🚩 RedFlag detected & message review mode: ON_REDFLAG - Saving as draft for review');
      } else {
        console.log(`✅ Message review mode: ${messageReviewMode}, isFlagged: ${isFlagged} - Auto-approving message`);
      }

      if (needsReview) {
        // Save as draft for review - DON'T send to WhatsApp yet
        const aiMessageData: DbChatMessage = {
          session_id: sessionId,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: { ...baseMetadata, status: 'draft' },
        };
        const savedMessage = await Database.addChatMessage(aiMessageData);

        if (savedMessage?.id) {
          return {
            id: savedMessage.id,
            role: 'assistant',
            content: aiResponse.content,
            timestamp: new Date(),
            metadata: { ...baseMetadata, status: 'draft' },
          };
        }
      } else {
        // Auto-approve and send
        const aiMessageData: DbChatMessage = {
          session_id: sessionId,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: { ...baseMetadata, approved: true, status: sendToWhatsApp ? 'sent' : 'approved' },
        };
        const savedMessage = await Database.addChatMessage(aiMessageData);

        // Auto-send on WhatsApp flow
        if (sendToWhatsApp && whatsappRecipient) {
          try {
            await this.sendMessage(whatsappRecipient, aiResponse.content);
          } catch (err) {
            console.error('❌ Failed to auto-send WhatsApp message:', err);
          }
        }

        if (savedMessage?.id) {
          return {
            id: savedMessage.id,
            role: 'assistant',
            content: aiResponse.content,
            timestamp: new Date(),
            metadata: { ...baseMetadata, approved: true, status: sendToWhatsApp ? 'sent' : 'approved' },
          };
        }
      }
    }
    
    return null;
  }

  async handleIncomingMessage(from: string, messageBody: string): Promise<void> {
    const session = await this.findOrCreateSession(from);
    await this.processMessage(
      session.id, 
      messageBody, 
      `WhatsApp (${from})`, 
      true, // WhatsApp senden
      from   // WhatsApp Empfänger
    );
  }

  // Multi-Customer: Handle incoming message for a specific user
  async handleIncomingMessageForUser(userId: string, from: string, messageBody: string): Promise<void> {
    console.log(`📱 Processing message for specific user ${userId} from ${from}`);
    
    // Create WhatsApp session in the context of this specific user
    const session = await this.findOrCreateSessionForUser(userId, from);
    await this.processMessage(
      session.id, 
      messageBody, 
      `WhatsApp (${from}) → User ${userId}`, 
      true, // WhatsApp senden
      from   // WhatsApp Empfänger
    );
  }

  // Multi-Customer: Find or create session for a specific user
  async findOrCreateSessionForUser(userId: string, phoneNumber: string): Promise<TestChatSession> {
    console.log(`👤 Finding/creating WhatsApp session for user ${userId} and phone ${phoneNumber}`);
    
    // Get the user's account_id
    const user = await Database.getUserById(userId);
    if (!user) {
      console.error(`❌ User ${userId} not found - falling back to default session creation`);
      return await this.findOrCreateSession(phoneNumber);
    }
    
    // Create session with user's account_id
    return await Database.createWhatsAppChatSessionForAccount(phoneNumber, user.account_id);
  }

  async handleTestMessage(sessionId: string, messageBody: string, preferredLanguage?: string): Promise<ChatMessage | null> {
    return await this.processMessage(
      sessionId, 
      messageBody, 
      `Test Chat (${sessionId})`, 
      false, // NICHT über WhatsApp senden
      undefined, // whatsappRecipient
      preferredLanguage
    );
  }

  async sendDraftMessage(sessionId: string, to: string): Promise<void> {
    const messages = await this.getMessageHistory(sessionId);
    const draft = [...messages].reverse().find(
      m => m.role === 'assistant' && m.metadata?.status === 'draft'
    );

    if (!draft) return;

    await this.sendMessage(to, draft.content);
    await Database.updateChatMessage(draft.id.toString(), {
      session_id: sessionId,
      role: 'assistant',
      content: draft.content,
      timestamp: new Date(draft.timestamp),
      metadata: { ...draft.metadata, status: 'sent' },
    });
  }
}

export const whatsappService = new WhatsAppService(); 