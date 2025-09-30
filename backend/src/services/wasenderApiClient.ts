import axios, { AxiosInstance } from 'axios';
import * as QRCode from 'qrcode';

export type WasenderSessionStatus = 'unknown' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'auth_failure' | 'idle';

type InternalStatus = {
  status: WasenderSessionStatus;
  meNumber: string | null;
  qrAvailable: boolean;
  qrGeneratedAt: number | null;
};

function getClient(sessionApiKey?: string): AxiosInstance {
  const baseURL = process.env.WASENDER_API_BASE_URL || '';
  const token = sessionApiKey || process.env.WASENDER_API_TOKEN || '';
  if (!baseURL || !token) {
    throw new Error('WASENDER_API_BASE_URL and token must be set');
  }
  return axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000,
    maxContentLength: 50 * 1024 * 1024,
    maxBodyLength: 50 * 1024 * 1024,
  });
}

function normalizePhoneToE164Digits(input: string): string {
  return (input || '').replace(/[^0-9]/g, '');
}

function mapWasenderStatusToInternal(status: string | undefined): WasenderSessionStatus {
  const s = (status || '').toString().toLowerCase();
  if (!s) return 'unknown';
  if (['ready', 'connected', 'online'].includes(s)) return 'ready';
  if (['authenticated', 'auth'].includes(s)) return 'authenticated';
  if (['pairing', 'qr', 'waiting_for_qr', 'requires_qr', 'connecting'].includes(s)) return 'qr';
  if (['logged_out', 'idle', 'need_scan'].includes(s)) return 'qr'; // ready for QR scan
  if (['disconnected', 'offline'].includes(s)) return 'disconnected';
  if (['auth_failure', 'auth-failure', 'authfailure'].includes(s)) return 'auth_failure';
  return 'unknown';
}

export const WasenderApiClient = {
  async listSessions(): Promise<any[]> {
    const http = getClient();
    const resp = await http.get('/api/whatsapp-sessions');
    const data: any = resp.data?.data || resp.data || [];
    return Array.isArray(data) ? data : [];
  },
  async createSessionForUser(label?: string, phoneNumber?: string): Promise<string> {
    const http = getClient();
    try {
      const payload: any = {};
      if (label) payload.name = label;
      if (phoneNumber) payload.phone_number = phoneNumber;
      // Optional defaults & webhook config
      payload.account_protection = true;
      payload.log_messages = true;
      payload.read_incoming_messages = true;
      if (process.env.WASENDER_WEBHOOK_URL) {
        payload.webhook_url = process.env.WASENDER_WEBHOOK_URL;
        payload.webhook_enabled = true;
        payload.webhook_events = ['messages.received', 'session.status', 'messages.update'];
      }
      const resp = await http.post('/api/whatsapp-sessions', payload);
      const data: any = resp.data?.data || resp.data || {};
      const id = data?.id || data?.whatsappSession || data?.sessionId;
      if (!id) throw new Error('Failed to create session: missing id in response');
      return id;
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      const msg = (body?.message || body?.error || JSON.stringify(body) || e.message || 'Session create failed');
      throw new Error(`Wasender create session failed (${status}): ${msg}`);
    }
  },
  async getStatusBySessionId(sessionId: string): Promise<InternalStatus> {
    const http = getClient();
    try {
      const resp = await http.get(`/api/whatsapp-sessions/${sessionId}`);
      const data: any = resp.data?.data || resp.data || {};
      
      // DEBUG: Log the raw response to understand what Wasender returns
      console.log(`🔍 Wasender API Response for session ${sessionId}:`, JSON.stringify(data, null, 2));
      
      const rawStatus = data?.status || data?.connectionStatus || data?.state;
      const status = mapWasenderStatusToInternal(rawStatus);
      const meNumber: string | null = (data?.me?.id || data?.user?.id || data?.phone_number || data?.meNumber || null);
      const qrAvailable = status === 'qr';
      
      console.log(`🔍 Mapped status: "${rawStatus}" -> "${status}", meNumber: "${meNumber}"`);
      
      return { status, meNumber, qrAvailable, qrGeneratedAt: null };
    } catch (e: any) {
      console.error(`❌ Error getting status for session ${sessionId}:`, e.message);
      return { status: 'unknown', meNumber: null, qrAvailable: false, qrGeneratedAt: null };
    }
  },
  async getStatus(): Promise<InternalStatus> {
    const http = getClient();
    const sessionId = process.env.WASENDER_SESSION_ID;

    try {
      // Prefer session detail when session id is provided
      if (sessionId) {
        const resp = await http.get(`/api/whatsapp-sessions/${sessionId}`);
        const data: any = resp.data?.data || resp.data || {};
        const status = mapWasenderStatusToInternal(data?.status || data?.connectionStatus);
        const meNumber: string | null = (data?.me?.id || data?.user?.id || data?.meNumber || null);
        const qrAvailable = status === 'qr';
        return { status, meNumber, qrAvailable, qrGeneratedAt: null };
      }
    } catch (e) {
      // ignore and try fallback
    }

    try {
      // No explicit session id: if exactly one session exists, use it
      const list = await http.get('/api/whatsapp-sessions');
      const sessions: any[] = list.data?.data || list.data || [];
      if (Array.isArray(sessions) && sessions.length === 1) {
        const s = sessions[0];
        const id = s?.id || s?.whatsappSession || s?.sessionId;
        if (id) {
          const resp = await http.get(`/api/whatsapp-sessions/${id}`);
          const data: any = resp.data?.data || resp.data || {};
          const status = mapWasenderStatusToInternal(data?.status || data?.connectionStatus);
          const meNumber: string | null = (data?.me?.id || data?.user?.id || data?.meNumber || null);
          const qrAvailable = status === 'qr';
          return { status, meNumber, qrAvailable, qrGeneratedAt: null };
        }
      }
    } catch (e) {
      // ignore and try global status
    }

    try {
      // Fallback: global status endpoint (if using session token instead of PAT)
      const resp = await http.get('/api/status');
      const data: any = resp.data?.data || resp.data || {};
      const status = mapWasenderStatusToInternal(data?.status);
      const meNumber: string | null = data?.user?.id || null;
      const qrAvailable = status === 'qr';
      return { status, meNumber, qrAvailable, qrGeneratedAt: null };
    } catch (e) {
      return { status: 'unknown', meNumber: null, qrAvailable: false, qrGeneratedAt: null };
    }
  },

  async connectSession(sessionIdOverride?: string): Promise<void> {
    const http = getClient();
    let sessionId = sessionIdOverride || process.env.WASENDER_SESSION_ID;
    if (!sessionId) {
      try {
        const list = await http.get('/api/whatsapp-sessions');
        const sessions: any[] = list.data?.data || list.data || [];
        if (Array.isArray(sessions) && sessions.length === 1) {
          sessionId = (sessions[0]?.id || sessions[0]?.whatsappSession || sessions[0]?.sessionId) as string | undefined;
        }
      } catch {}
    }
    if (!sessionId) throw new Error('WASENDER_SESSION_ID must be set to connect session (or keep exactly one session in Wasender)');
    await http.post(`/api/whatsapp-sessions/${sessionId}/connect`, {});
  },

  async getQrDataUrl(sessionIdOverride?: string): Promise<string | null> {
    const http = getClient();
    let sessionId = sessionIdOverride || process.env.WASENDER_SESSION_ID;
    if (!sessionId) {
      try {
        const list = await http.get('/api/whatsapp-sessions');
        const sessions: any[] = list.data?.data || list.data || [];
        if (Array.isArray(sessions) && sessions.length === 1) {
          sessionId = (sessions[0]?.id || sessions[0]?.whatsappSession || sessions[0]?.sessionId) as string | undefined;
        }
      } catch {}
    }
    if (!sessionId) throw new Error('WASENDER_SESSION_ID must be set to get QR (or keep exactly one session in Wasender)');

    try {
      console.log(`🔍 Requesting QR for session ${sessionId}...`);
      
      // Try as JSON first (Wasender seems to return JSON)
      const resp = await http.get(`/api/whatsapp-sessions/${sessionId}/qrcode`);
      const contentType = resp.headers['content-type'] || 'application/json';
      
      console.log(`🔍 QR Response: ${resp.status}, Content-Type: ${contentType}, Size: ${JSON.stringify(resp.data).length} bytes`);
      console.log(`🔍 QR JSON Response:`, JSON.stringify(resp.data, null, 2));
      
      // Check for different QR response formats
      let qrString = null;
      
      // Format: { "data": { "qrCode": "string" } }
      if (resp.data?.data?.qrCode) {
        qrString = resp.data.data.qrCode;
      }
      // Format: { "qr": "string" } or { "qrcode": "string" }
      else if (resp.data?.qr || resp.data?.qrcode) {
        qrString = resp.data.qr || resp.data.qrcode;
      }
      // Format: { "data": "string" }
      else if (resp.data?.data && typeof resp.data.data === 'string') {
        qrString = resp.data.data;
      }
      // Format: "string" (direct string response)
      else if (typeof resp.data === 'string' && resp.data.length > 10) {
        qrString = resp.data;
      }
      
      if (qrString) {
        console.log(`🔍 Found QR string: ${qrString.substring(0, 50)}...`);
        
        // If it's already a data URL, return as is
        if (qrString.startsWith('data:image/')) {
          return qrString;
        }
        
        // If it looks like base64 image data, wrap it
        if (qrString.length > 100 && !qrString.includes('@')) {
          return `data:image/png;base64,${qrString}`;
        }
        
        // For WhatsApp QR strings, we need to generate a QR code image
        // This is a WhatsApp connection string, not an image
        console.log(`🔍 QR is WhatsApp connection string, need to generate QR image`);
        
        // We'll use a QR code generator library to convert the string to image
        try {
          const qrDataUrl = await QRCode.toDataURL(qrString);
          return qrDataUrl;
        } catch (qrError: any) {
          console.log(`🔍 QR generation failed: ${qrError.message}`);
        }
      }
      
      return null;
    } catch (e: any) {
      console.log(`🔍 QR JSON request failed: ${e.message}`);
      
      // Fallback: Try as image (arraybuffer)
      try {
        const resp = await http.get(`/api/whatsapp-sessions/${sessionId}/qrcode`, { responseType: 'arraybuffer' });
        const contentType = resp.headers['content-type'] || 'image/png';
        
        console.log(`🔍 QR Image Response: ${resp.status}, Content-Type: ${contentType}, Size: ${resp.data?.length} bytes`);
        
        if (resp.data && resp.data.length > 0) {
          const base64 = Buffer.from(resp.data, 'binary').toString('base64');
          return `data:${contentType};base64,${base64}`;
        }
      } catch (imageError: any) {
        console.log(`🔍 QR Image request also failed: ${imageError.message}`);
      }
      
      return null;
    }
  },

  async sendTextMessage(toPhoneE164: string, message: string): Promise<void> {
    let sessionId = process.env.WASENDER_SESSION_ID;
    let sessionApiKey: string | undefined;
    
    // Auto-detect session if not configured
    if (!sessionId) {
      console.log('🔍 No WASENDER_SESSION_ID configured, auto-detecting...');
      const sessions = await this.listSessions();
      if (sessions.length === 1) {
        sessionId = sessions[0].id || sessions[0].whatsappSession || sessions[0].sessionId;
        sessionApiKey = sessions[0].apiKey || sessions[0].api_key;
        console.log(`🔍 Auto-detected session: ${sessionId}, API Key: ${sessionApiKey ? 'present' : 'missing'}`);
      } else if (sessions.length === 0) {
        throw new Error('No active WasenderAPI sessions found');
      } else {
        throw new Error(`Multiple sessions found (${sessions.length}). Please set WASENDER_SESSION_ID explicitly.`);
      }
    } else {
      // If session ID is configured, try to get its API key
      const sessions = await this.listSessions();
      const session = sessions.find(s => 
        (s.id === sessionId) || 
        (s.whatsappSession === sessionId) || 
        (s.sessionId === sessionId)
      );
      if (session) {
        sessionApiKey = session.apiKey || session.api_key;
        console.log(`🔍 Found configured session ${sessionId}, API Key: ${sessionApiKey ? 'present' : 'missing'}`);
      }
    }
    
    // Use Session API Key if available, otherwise fallback to Personal Access Token
    const http = getClient(sessionApiKey);
    
    const number = normalizePhoneToE164Digits(toPhoneE164);
    const payload: any = {
      type: 'text',
      to: number,
      text: message,
    };
    if (sessionId) payload.sessionId = sessionId;
    
    console.log(`📤 Sending message to ${number} via session ${sessionId} (using ${sessionApiKey ? 'Session API Key' : 'Personal Access Token'})`);
    await http.post('/api/send-message', payload);
  },

  // Update webhook settings for an existing session
  async updateSessionWebhook(sessionId: string, webhookUrl?: string): Promise<void> {
    const http = getClient();
    const url = webhookUrl || process.env.WASENDER_WEBHOOK_URL;
    
    if (!url) {
      console.log(`⚠️ No webhook URL configured for session ${sessionId}`);
      return;
    }

    try {
      const payload = {
        webhook_url: url,
        webhook_enabled: true,
        webhook_events: ['messages.received', 'session.status', 'messages.update']
      };

      console.log(`🔗 Updating webhook for session ${sessionId} to ${url}`);
      await http.put(`/api/whatsapp-sessions/${sessionId}`, payload);
      console.log(`✅ Webhook updated successfully for session ${sessionId}`);
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      const msg = (body?.message || body?.error || JSON.stringify(body) || e.message || 'Webhook update failed');
      console.error(`❌ Failed to update webhook for session ${sessionId} (${status}): ${msg}`);
      throw new Error(`Webhook update failed (${status}): ${msg}`);
    }
  },

  // Ensure all user sessions have correct webhook configuration
  async ensureWebhooksForAllSessions(): Promise<void> {
    const webhookUrl = process.env.WASENDER_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log(`⚠️ No WASENDER_WEBHOOK_URL configured, skipping webhook setup`);
      return;
    }

    try {
      console.log(`🔗 Ensuring all sessions have webhook: ${webhookUrl}`);
      const sessions = await this.listSessions();
      
      for (const session of sessions) {
        const sessionId = session.id || session.whatsappSession || session.sessionId;
        if (sessionId) {
          try {
            await this.updateSessionWebhook(sessionId, webhookUrl);
          } catch (error) {
            console.error(`❌ Failed to update webhook for session ${sessionId}:`, error);
            // Continue with other sessions
          }
        }
      }
      console.log(`✅ Webhook setup completed for ${sessions.length} sessions`);
    } catch (error) {
      console.error(`❌ Error ensuring webhooks for all sessions:`, error);
    }
  },

  // Delete session from WasenderAPI
  async deleteSession(sessionId: string): Promise<void> {
    const http = getClient();
    console.log(`🗑️ Deleting session ${sessionId} from WasenderAPI...`);
    
    try {
      await http.delete(`/api/whatsapp-sessions/${sessionId}`);
      console.log(`✅ Session ${sessionId} deleted successfully from WasenderAPI`);
    } catch (error: any) {
      // If session doesn't exist on wasenderapi (404), that's actually fine
      if (error.response?.status === 404) {
        console.log(`ℹ️ Session ${sessionId} was already deleted from WasenderAPI (404)`);
        return;
      }
      console.error(`❌ Failed to delete session ${sessionId} from WasenderAPI:`, error.message);
      throw error;
    }
  },
};

export type { InternalStatus as WasenderClientStatus };


