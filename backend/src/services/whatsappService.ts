import { Database } from '../models/database';
import { AIService } from './aiService';
import { TestChatSession, ChatMessage, DbChatMessage } from '../types';
import { TypingDelayService } from '../utils/typingDelay';
import axios, { AxiosError } from 'axios';

class WhatsAppService {
  /**
   * Sendet "typing"-Indikator an WhatsApp (falls verfügbar)
   */
  private async sendTypingIndicator(to: string): Promise<void> {
    // WhatsApp Business API typing indicator (optional - not all versions support this)
    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: '...' // Minimal message to simulate typing
      }
    };

    try {
      await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      console.log(`⌨️ Typing indicator sent to ${to}`);
    } catch (error) {
      // Typing indicator is optional, don't log errors
      console.log(`⌨️ Typing indicator not supported or failed for ${to}`);
    }
  }

  async findOrCreateSession(phoneNumber: string): Promise<TestChatSession> {
    // For now, we'll create a new session each time since the Database class
    // doesn't have phone-specific session methods
    const session = await Database.createTestChatSession();
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
    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      to,
      text: { body: message },
    };
    const headers = {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };

    try {
      await axios.post(url, data, { headers });
      console.log(`WhatsApp message sent to ${to}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error sending WhatsApp message:', error.response?.data);
      } else {
        console.error('Error sending WhatsApp message:', error);
      }
    }
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
      // AI Response als "draft" speichern (NICHT automatisch senden)
      const aiMessageData: DbChatMessage = {
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        metadata: { ...aiResponse.metadata, status: 'draft' },
      };
      const savedMessage = await Database.addChatMessage(aiMessageData);

      // Für Review-Flow: Nur Draft zurückgeben
      if (savedMessage?.id) {
        return {
          id: savedMessage.id,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: { ...aiResponse.metadata, status: 'draft' },
        };
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