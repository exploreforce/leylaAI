import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import QRCode from 'qrcode';

export type WhatsAppWebStatus = 'idle' | 'qr' | 'authenticated' | 'ready' | 'disconnected' | 'auth_failure';

class WhatsAppWebClient {
  private client: Client | null = null;
  private status: WhatsAppWebStatus = 'idle';
  private lastQr: string | null = null;
  private lastQrGeneratedAt: number | null = null;
  private meNumber: string | null = null;
  private onMessageHandler: ((msg: Message) => Promise<void> | void) | null = null;

  public async init(onMessage?: (msg: Message) => Promise<void> | void): Promise<void> {
    if (this.client) return; // already initialized

    this.onMessageHandler = onMessage || null;

    const sessionPath = process.env.WA_SESSION_PATH || './storage/wa-session';

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr: string) => {
      this.status = 'qr';
      this.lastQr = qr;
      this.lastQrGeneratedAt = Date.now();
      console.log('📲 WhatsApp QR received. Open the admin QR endpoint to scan.');
    });

    this.client.on('authenticated', () => {
      this.status = 'authenticated';
      console.log('✅ WhatsApp authenticated');
    });

    this.client.on('ready', async () => {
      this.status = 'ready';
      try {
        const info = await this.client!.getState();
        console.log('✅ WhatsApp ready. State:', info);
      } catch {}
      try {
        const me = await this.client!.getNumberId('0'); // will throw; keep meNumber null
      } catch {}
    });

    this.client.on('auth_failure', (m) => {
      this.status = 'auth_failure';
      console.error('❌ WhatsApp auth failure:', m);
    });

    this.client.on('disconnected', (r) => {
      this.status = 'disconnected';
      console.warn('⚠️ WhatsApp disconnected:', r);
    });

    this.client.on('message', async (message: Message) => {
      if (this.onMessageHandler) {
        try {
          await this.onMessageHandler(message);
        } catch (e) {
          console.error('Error in onMessage handler:', e);
        }
      }
    });

    await this.client.initialize();
  }

  public getStatus(): { status: WhatsAppWebStatus; meNumber: string | null; qrAvailable: boolean; qrGeneratedAt: number | null } {
    return { status: this.status, meNumber: this.meNumber, qrAvailable: !!this.lastQr, qrGeneratedAt: this.lastQrGeneratedAt };
  }

  public async getQrDataUrl(): Promise<string | null> {
    if (!this.lastQr) return null;
    return await QRCode.toDataURL(this.lastQr);
  }

  public async sendMessage(toPhoneE164OrChatId: string, message: string): Promise<void> {
    if (!this.client) throw new Error('WhatsApp client not initialized');
    // Accept raw chat id (ends with @c.us) or phone number → convert to chat id
    const chatId = toPhoneE164OrChatId.includes('@') ? toPhoneE164OrChatId : `${toPhoneE164OrChatId.replace(/[^0-9]/g, '')}@c.us`;
    await this.client.sendMessage(chatId, message);
  }
}

export const whatsappWebClient = new WhatsAppWebClient();



