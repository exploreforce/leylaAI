import { WasenderApiClient } from './wasenderApiClient';
import { whatsappService } from './whatsappService';

class WasenderMessagePoller {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private lastMessageIds: Set<string> = new Set();

  async start() {
    if (this.isRunning) {
      console.log('📡 Message poller is already running');
      return;
    }

    this.isRunning = true;
    console.log('📡 Starting WasenderAPI message poller...');
    
    // Check for messages every 10 seconds
    this.intervalId = setInterval(async () => {
      await this.checkForNewMessages();
    }, 10000);

    // Initial check
    await this.checkForNewMessages();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('📡 Message poller stopped');
  }

  private async checkForNewMessages() {
    try {
      // Get all sessions from WasenderAPI
      const sessions = await WasenderApiClient.listSessions();
      
      for (const session of sessions) {
        const sessionId = session.id || session.whatsappSession || session.sessionId;
        if (!sessionId) continue;

        // Check for new messages in this session
        await this.checkSessionMessages(sessionId, session.phone_number);
      }
    } catch (error) {
      console.error('📡 Error checking for messages:', error);
    }
  }

  private async checkSessionMessages(sessionId: string, phoneNumber: string) {
    try {
      // This would need to be implemented in WasenderApiClient
      // For now, we'll use a placeholder that checks session status
      const status = await WasenderApiClient.getStatusBySessionId(sessionId);
      
      // In a real implementation, you'd fetch recent messages from WasenderAPI
      // and compare with lastMessageIds to find new ones
      
      console.log(`📡 Checked session ${sessionId} (${phoneNumber}): ${status.status}`);
    } catch (error) {
      console.error(`📡 Error checking session ${sessionId}:`, error);
    }
  }

  isPolling(): boolean {
    return this.isRunning;
  }
}

export const messagePoller = new WasenderMessagePoller();
