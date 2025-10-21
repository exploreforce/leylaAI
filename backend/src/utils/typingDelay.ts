/**
 * Utility für realistische Typing-Verzögerungen
 * Verwendet sowohl vom WhatsApp Service als auch vom Test Chat
 */

export class TypingDelayService {
  // Konfiguration für Typing-Verzögerung
  private static readonly TYPING_DELAY_ENABLED = process.env.WHATSAPP_TYPING_DELAY !== 'false';
  private static readonly MIN_RANDOM_DELAY = 1; // Mindest-Zufallsverzögerung in Sekunden
  private static readonly MAX_RANDOM_DELAY = 12; // Maximal-Zufallsverzögerung in Sekunden
  private static readonly CHARS_PER_SECOND = 2.5; // Zeichen pro Sekunde beim Tippen (= 0.4 sec/char)

  /**
   * Berechnet realistische Typing-Verzögerung basierend auf Nachrichtenlänge
   * @param message Die zu sendende Nachricht
   * @returns Verzögerung in Millisekunden
   */
  static calculateTypingDelay(message: string): number {
    if (!this.TYPING_DELAY_ENABLED) {
      console.log(`📝 Typing delay disabled by configuration`);
      return 0;
    }

    const characterCount = message.length;
    
    // Typing-Zeit basierend auf konfigurierten Zeichen pro Sekunde
    const typingTimeSeconds = characterCount / this.CHARS_PER_SECOND;
    
    // Zufällige Verzögerung zwischen MIN und MAX
    const randomRange = this.MAX_RANDOM_DELAY - this.MIN_RANDOM_DELAY;
    const randomDelaySeconds = Math.random() * randomRange + this.MIN_RANDOM_DELAY;
    
    const totalDelaySeconds = typingTimeSeconds + randomDelaySeconds;
    
    console.log(`📝 Typing delay calculated: ${characterCount} chars → ${typingTimeSeconds.toFixed(1)}s typing + ${randomDelaySeconds.toFixed(1)}s random = ${totalDelaySeconds.toFixed(1)}s total`);
    
    return Math.round(totalDelaySeconds * 1000); // Convert to milliseconds
  }

  /**
   * Wartet für die angegebene Zeit
   * @param ms Millisekunden zu warten
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Berechnet und führt die Typing-Verzögerung aus
   * @param message Die Nachricht für die das Delay berechnet werden soll
   * @param context Kontext für Logging (z.B. "Test Chat", "WhatsApp")
   */
  static async applyTypingDelay(message: string, context: string = 'Chat'): Promise<void> {
    const delayMs = this.calculateTypingDelay(message);
    
    if (delayMs > 0) {
      console.log(`⏳ ${context}: Waiting ${delayMs}ms before sending response...`);
      await this.delay(delayMs);
      console.log(`📤 ${context}: Delay completed, sending response`);
    }
  }
}


