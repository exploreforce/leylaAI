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

  async findOrCreateSession(phoneNumber: string): Promise<TestChatSession> {
    // Create or find existing WhatsApp session for this phone number
    const session = await Database.createWhatsAppChatSession(phoneNumber);
    return session;
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
    whatsappRecipient?: string
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
    const aiResponse = await AIService.getChatResponse(messageHistory, sessionId);

    if (aiResponse.content) {
      const isFlagged = Boolean((aiResponse as any)?.metadata?.isFlagged);
      const baseMetadata: any = { ...(aiResponse.metadata || {}) };

      if (isFlagged) {
        // Flagged → Draft for review
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
        // Not flagged → Auto-approve (and auto-send if WhatsApp)
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
    
    // For now, use the same logic as regular findOrCreateSession
    // In a full multi-tenant setup, you'd want to link sessions to specific users
    // TODO: Add user_id column to test_chat_sessions table for proper multi-tenancy
    
    return await this.findOrCreateSession(phoneNumber);
  }

  async handleTestMessage(sessionId: string, messageBody: string): Promise<ChatMessage | null> {
    return await this.processMessage(
      sessionId, 
      messageBody, 
      `Test Chat (${sessionId})`, 
      false // NICHT über WhatsApp senden
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