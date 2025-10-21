import knex from 'knex';
import { BotConfig, Appointment, AvailabilityConfig, BlackoutDate, TestChatSession, ChatMessage, DbChatMessage, Service, CreateServiceRequest } from '../types';

const environment = process.env.NODE_ENV || 'development';
const config = require('../../knexfile')[environment];

export const db = knex(config);

// Database helper functions
export class Database {
  // Users & Accounts
  static async getUserByFeedToken(feedToken: string): Promise<{ id: string; account_id: string } | null> {
    const user = await db('users').select('id', 'account_id').where({ calendar_feed_token: feedToken }).first();
    return user || null;
  }

  static async getUserById(userId: string): Promise<{ id: string; account_id: string; email: string } | null> {
    const user = await db('users').select('id', 'account_id', 'email').where({ id: userId }).first();
    return user || null;
  }

  static async getUserWasenderSessionId(userId: string): Promise<string | null> {
    const user = await db('users').select('wasender_session_id').where({ id: userId }).first();
    return user?.wasender_session_id || null;
  }

  static async setUserWasenderSessionId(userId: string, sessionId: string): Promise<void> {
    await db('users')
      .where({ id: userId })
      .update({ wasender_session_id: sessionId, wasender_session_updated_at: new Date() });
  }

  static async ensureUserFeedToken(userId: string): Promise<string> {
    const existing = await db('users').where({ id: userId }).first();
    if (existing?.calendar_feed_token) return existing.calendar_feed_token;
    const { randomUUID } = require('crypto');
    const token = randomUUID();
    await db('users').where({ id: userId }).update({ calendar_feed_token: token, updated_at: new Date() });
    return token;
  }

  /**
   * Get the timezone for a specific account
   * @param accountId - Account ID
   * @returns Promise<string> - IANA timezone string (defaults to 'Europe/Vienna')
   */
  static async getAccountTimezone(accountId: string | undefined): Promise<string> {
    if (!accountId) {
      console.warn('⚠️ No accountId provided for timezone lookup, using default: Europe/Vienna');
      return 'Europe/Vienna';
    }

    try {
      const account = await db('accounts')
        .select('timezone')
        .where('id', accountId)
        .first();

      if (!account || !account.timezone) {
        console.warn(`⚠️ No timezone found for account ${accountId}, using default: Europe/Vienna`);
        return 'Europe/Vienna';
      }

      return account.timezone;
    } catch (error) {
      console.error(`❌ Error fetching timezone for account ${accountId}:`, error);
      return 'Europe/Vienna';
    }
  }

  // Bot Config operations
  static async getBotConfig(accountId: string): Promise<BotConfig | null> {
    console.log(`[AccountId: ${accountId}] Fetching bot config...`);
    const result = await db('bot_configs')
      .where('account_id', accountId)
      .where('is_active', true)
      .first();
    
    if (!result) {
      console.log(`[AccountId: ${accountId}] No bot config found, will create default`);
      return null;
    }
    
    // Transform database snake_case to TypeScript camelCase
    return {
      id: result.id,
      // Legacy fields
      systemPrompt: result.system_prompt || 'You are a helpful AI assistant.',
      tone: result.tone || 'friendly',
      businessHours: result.business_hours || '9:00-17:00',
      timezone: result.timezone || 'UTC',
      maxAppointmentDuration: result.max_appointment_duration || 120,
      bufferTime: result.buffer_time || 15,
      
      // New configuration fields
      botName: result.bot_name || 'AI Assistant',
      botDescription: result.bot_description || 'Ein hilfreicher AI-Assistent für Terminbuchungen',
      personalityTone: result.personality_tone || 'friendly',
      characterTraits: result.character_traits || 'Hilfsbereit, geduldig, verständnisvoll',
      backgroundInfo: result.background_info || 'Ich bin ein AI-Assistent, der dabei hilft, Termine zu koordinieren',
      servicesOffered: result.services_offered || 'Terminbuchung, Terminverwaltung, Informationen zu Verfügbarkeiten',
      escalationRules: result.escalation_rules || 'Bei komplexen Anfragen oder Beschwerden weiterleiten',
      botLimitations: result.bot_limitations || 'Keine medizinischen Beratungen, keine Rechtsberatung, keine persönlichen Informationen preisgeben',
      generatedSystemPrompt: result.generated_system_prompt,
      reviewMode: result.review_mode || 'never',
      messageReviewMode: result.message_review_mode || 'never',
      
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at)
    };
  }

  static async updateBotConfig(accountId: string, updates: Partial<BotConfig>): Promise<BotConfig> {
    console.log(`[AccountId: ${accountId}] Updating bot config...`);

    // Transform camelCase to snake_case for database
    const dbUpdates: any = {};
    
    if (updates.systemPrompt !== undefined) dbUpdates.system_prompt = updates.systemPrompt;
    if (updates.tone !== undefined) dbUpdates.tone = updates.tone;
    if (updates.businessHours !== undefined) dbUpdates.business_hours = updates.businessHours;
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
    if (updates.maxAppointmentDuration !== undefined) dbUpdates.max_appointment_duration = updates.maxAppointmentDuration;
    if (updates.bufferTime !== undefined) dbUpdates.buffer_time = updates.bufferTime;
    
    // New fields
    if (updates.botName !== undefined) dbUpdates.bot_name = updates.botName;
    if (updates.botDescription !== undefined) dbUpdates.bot_description = updates.botDescription;
    if (updates.personalityTone !== undefined) dbUpdates.personality_tone = updates.personalityTone;
    if (updates.characterTraits !== undefined) dbUpdates.character_traits = updates.characterTraits;
    if (updates.backgroundInfo !== undefined) dbUpdates.background_info = updates.backgroundInfo;
    if (updates.servicesOffered !== undefined) dbUpdates.services_offered = updates.servicesOffered;
    if (updates.escalationRules !== undefined) dbUpdates.escalation_rules = updates.escalationRules;
    if (updates.botLimitations !== undefined) dbUpdates.bot_limitations = updates.botLimitations;
    if (updates.generatedSystemPrompt !== undefined) dbUpdates.generated_system_prompt = updates.generatedSystemPrompt;
    if (updates.reviewMode !== undefined) dbUpdates.review_mode = updates.reviewMode;
    if (updates.messageReviewMode !== undefined) dbUpdates.message_review_mode = updates.messageReviewMode;
    
    dbUpdates.updated_at = new Date();

    await db('bot_configs')
      .where('account_id', accountId)
      .where('is_active', true)
      .update(dbUpdates);

    // Return the updated config
    return this.getBotConfig(accountId) as Promise<BotConfig>;
  }

  // Appointment operations (NO DATE OBJECTS - STRING ONLY!)
  static async getAppointments(filters: {
    startDateStr?: string;
    endDateStr?: string;
    status?: string;
    accountId?: string;
    includeInactive?: boolean; // If false (default), only return active appointments (pending, booked, confirmed)
  } = {}): Promise<Appointment[]> {
    try {
      console.log('🔍 Database.getAppointments called with STRING filters:', {
        startDateStr: filters.startDateStr,
        endDateStr: filters.endDateStr,
        status: filters.status,
        accountId: filters.accountId,
        includeInactive: filters.includeInactive
      });

      let query = db('appointments')
        .select(
          'appointments.*',
          'services.name as service_name'
        )
        .leftJoin('services', 'appointments.appointment_type', 'services.id');
      
      if (filters.startDateStr) {
        // Use date string directly with 00:00 time
        const startDateTimeStr = `${filters.startDateStr} 00:00`;
        console.log('🔍 Adding startDate filter (LOCAL STRING): datetime >=', startDateTimeStr);
        query = query.where('appointments.datetime', '>=', startDateTimeStr);
      }
      
      if (filters.endDateStr) {
        // Use date string directly with 23:59 time
        const endDateTimeStr = `${filters.endDateStr} 23:59`;
        console.log('🔍 Adding endDate filter (LOCAL STRING): datetime <=', endDateTimeStr);
        query = query.where('appointments.datetime', '<=', endDateTimeStr);
      }
      
      // Status filtering logic
      if (filters.status) {
        // If explicit status is provided, use it
        console.log('🔍 Adding explicit status filter:', filters.status);
        query = query.where('appointments.status', filters.status);
      } else if (filters.includeInactive === false || filters.includeInactive === undefined) {
        // Default behavior: only include active appointments (exclude cancelled, completed, noshow)
        const activeStatuses = ['pending', 'booked', 'confirmed'];
        console.log('🔍 Adding active status filter (excluding cancelled/completed/noshow):', activeStatuses);
        query = query.whereIn('appointments.status', activeStatuses);
      }
      // If includeInactive is true and no explicit status, return all statuses
      
      // AccountId filtering with NULL handling
      // NULL accountIds should block ALL accounts (system-wide bookings)
      if (filters.accountId) {
        console.log('🔍 Adding account filter (including NULL accountIds):', filters.accountId);
        query = query.where(function() {
          this.where('appointments.account_id', filters.accountId)
            .orWhereNull('appointments.account_id');
        });
      }
      
      console.log('🔍 Executing query:', query.toString());
      
      const results = await query.orderBy('appointments.datetime', 'asc');
      
      console.log('🔍 Raw database results:', {
        count: results?.length || 0,
        results: results?.map(r => ({
          id: r.id,
          customer_name: r.customer_name,
          datetime: r.datetime,
          datetimeType: typeof r.datetime,
          status: r.status
        })) || []
      });
      
      // Transform snake_case to camelCase (NO TIMEZONE CONVERSION!)
      return (results || []).map(row => ({
        id: row.id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        customerEmail: row.customer_email,
        datetime: row.datetime, // Keep as string - NO Date conversion!
        duration: row.duration,
        status: row.status,
        notes: row.notes,
        appointmentType: row.appointment_type,
        serviceName: row.service_name || row.appointment_type, // Use service name if available, fallback to UUID
        accountId: row.account_id, // ← ENABLED: Column added via migration
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  }

  static async createAppointment(appointment: any): Promise<Appointment> {
    console.log('📝 Database.createAppointment called with:', appointment);
    
    try {
      const [created] = await db('appointments')
        .insert(appointment)
        .returning('*');
      
      console.log('📝 Database.createAppointment INSERT result:', {
        created: !!created,
        id: created?.id,
        datetime: created?.datetime,
        datetimeType: typeof created?.datetime
      });
      
      if (!created || !created.id) {
        throw new Error('INSERT returned no data - appointment may not have been created!');
      }
      
      // VERIFY: Immediately query back to confirm it was saved
      const verification = await db('appointments')
        .where('id', created.id)
        .first();
      
      console.log('📝 Database.createAppointment VERIFICATION:', {
        found: !!verification,
        id: verification?.id
      });
      
      if (!verification) {
        throw new Error(`Appointment ${created.id} was not found after INSERT - transaction may have failed!`);
      }
      
      // Transform snake_case back to camelCase for API response
      // NO TIMEZONE CONVERSION - keep datetime as-is
      return {
        id: created.id,
        customerName: created.customer_name,
        customerPhone: created.customer_phone,
        customerEmail: created.customer_email,
        datetime: created.datetime, // Keep as string - no Date conversion
        duration: created.duration,
        status: created.status,
        notes: created.notes,
        appointmentType: created.appointment_type,
        createdAt: new Date(created.created_at),
        updatedAt: new Date(created.updated_at)
      };
    } catch (error) {
      console.error('❌ Database.createAppointment FAILED:', error);
      throw error;
    }
  }

  static async updateAppointment(id: string, updates: Partial<Appointment>, accountId?: string): Promise<Appointment | null> {
    console.log('🔄 Database.updateAppointment called:', {
      id,
      updates,
      accountId,
      datetimeInUpdates: updates.datetime,
      datetimeType: typeof updates.datetime
    });

    // NO TIMEZONE CONVERSION - store datetime as-is
    const processedUpdates: any = { ...updates };
    
    if (updates.datetime) {
      console.log('🔄 Processing datetime update (NO TIMEZONE CONVERSION):', updates.datetime);
      
      // Keep datetime as string - no Date object conversion to avoid timezone issues
      if (typeof updates.datetime === 'string') {
        // Format: "2025-08-12 11:00" or "2025-08-12T11:00:00"
        const datetimeStr = (updates.datetime as string).replace('T', ' ').slice(0, 16);
        processedUpdates.datetime = datetimeStr;
        console.log('🔄 Using datetime as LOCAL string:', processedUpdates.datetime);
      } else if (updates.datetime instanceof Date) {
        // Convert Date to local datetime string to avoid timezone conversion
        const dateObj = updates.datetime as Date;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hour = String(dateObj.getHours()).padStart(2, '0');
        const minute = String(dateObj.getMinutes()).padStart(2, '0');
        processedUpdates.datetime = `${year}-${month}-${day} ${hour}:${minute}`;
        console.log('🔄 Converted Date to LOCAL string:', processedUpdates.datetime);
      } else if (updates.datetime) {
        // Handle any other format by converting to string first
        const datetimeStr = String(updates.datetime).replace('T', ' ').slice(0, 16);
        processedUpdates.datetime = datetimeStr;
        console.log('🔄 Converted unknown type to LOCAL string:', processedUpdates.datetime);
      }
      
      console.log('🔄 Final datetime for DB update (LOCAL):', {
        value: processedUpdates.datetime,
        type: typeof processedUpdates.datetime,
        message: 'Stored as local datetime string without timezone'
      });
    }

    let query = db('appointments')
      .where('id', id);
    
    // Filter by accountId if provided
    if (accountId) {
      query = query.where('account_id', accountId);
    }
    
    const [updated] = await query
      .update({
        ...processedUpdates,
        updated_at: new Date()
      })
      .returning('*');
    
    console.log('🔄 Database update result:', {
      found: !!updated,
      updatedDatetime: updated?.datetime,
      updatedDatetimeType: typeof updated?.datetime
    });

    if (updated) {
      // Transform back to camelCase
      return {
        id: updated.id,
        customerName: updated.customer_name,
        customerPhone: updated.customer_phone,
        customerEmail: updated.customer_email,
        datetime: updated.datetime,
        duration: updated.duration,
        status: updated.status,
        notes: updated.notes,
        appointmentType: updated.appointment_type,
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at)
      };
    }
    
    return null;
  }

  static async deleteAppointment(id: string): Promise<boolean> {
    const result = await db('appointments')
      .where('id', id)
      .update({
        status: 'cancelled',
        updated_at: new Date()
      });
    return result > 0;
  }

  // Availability operations
  static async getAvailabilityConfig(accountId: string): Promise<AvailabilityConfig | null> {
    try {
      console.log(`[AccountId: ${accountId}] Fetching availability config...`);
      const result = await db('availability_configs')
        .where('account_id', accountId)
        .where('is_active', true)
        .first();
      
      if (!result) {
        console.log(`[AccountId: ${accountId}] No availability config found, creating default...`);
        // Create default availability config
        const defaultWeeklySchedule = {
          monday: { dayOfWeek: 1, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          tuesday: { dayOfWeek: 2, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          wednesday: { dayOfWeek: 3, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          thursday: { dayOfWeek: 4, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          friday: { dayOfWeek: 5, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          saturday: { dayOfWeek: 6, isAvailable: false, timeSlots: [] },
          sunday: { dayOfWeek: 0, isAvailable: false, timeSlots: [] }
        };
        return await this.updateAvailabilityConfig(accountId, defaultWeeklySchedule);
      }
      
      try {
        result.weekly_schedule = JSON.parse(result.weekly_schedule || '{}');
      } catch (jsonError) {
        console.error('Error parsing weekly_schedule JSON:', jsonError);
        result.weekly_schedule = {};
      }
      
      // Load blackout dates from separate table
      const blackoutDates = await this.getBlackoutDates(accountId);
      
      // Transform database fields to camelCase
      return {
        id: result.id,
        weeklySchedule: result.weekly_schedule,
        blackoutDates: blackoutDates || [],
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at)
      };
    } catch (error) {
      console.error('Error fetching availability config:', error);
      return null;
    }
  }

  static async updateAvailabilityConfig(accountId: string, weeklySchedule: any): Promise<AvailabilityConfig> {
    console.log(`[AccountId: ${accountId}] Updating availability config...`);
    
    // Check if config exists for this account
    const existing = await db('availability_configs')
      .where('account_id', accountId)
      .where('is_active', true)
      .first();
    
    if (existing) {
      // Update existing
      await db('availability_configs')
        .where('account_id', accountId)
        .where('is_active', true)
        .update({
          weekly_schedule: JSON.stringify(weeklySchedule),
          updated_at: new Date()
        });
    } else {
      // Create new
      const { v4: uuidv4 } = require('uuid');
      await db('availability_configs').insert({
        id: uuidv4(),
        account_id: accountId,
        weekly_schedule: JSON.stringify(weeklySchedule),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    return await this.getAvailabilityConfig(accountId) as AvailabilityConfig;
  }

  // Blackout dates operations
  static async getBlackoutDates(accountId: string, startDate?: Date, endDate?: Date): Promise<BlackoutDate[]> {
    try {
      let query = db('blackout_dates')
        .where('account_id', accountId)
        .select('*');
      
      if (startDate) {
        query = query.where('date', '>=', startDate);
      }
      if (endDate) {
        query = query.where('date', '<=', endDate);
      }
      
      const results = await query.orderBy('date', 'asc');
      return results || [];
    } catch (error) {
      console.error('Error fetching blackout dates:', error);
      return [];
    }
  }

  static async addBlackoutDate(accountId: string, blackoutDate: Omit<BlackoutDate, 'id' | 'createdAt' | 'updatedAt'>): Promise<BlackoutDate> {
    const [created] = await db('blackout_dates')
      .insert({
        ...blackoutDate,
        account_id: accountId
      })
      .returning('*');
    return created;
  }

  static async removeBlackoutDate(id: string): Promise<boolean> {
    const result = await db('blackout_dates')
      .where('id', id)
      .del();
    return result > 0;
  }

  // Test chat operations
  static async getActiveTestChatSession(accountId: string): Promise<TestChatSession | null> {
    console.log(`💾 Database: [AccountId: ${accountId}] Getting active test chat session...`);
    
    try {
      // Get the most recent session for this account (within last 24 hours to keep it reasonable)
      const session = await db('test_chat_sessions')
        .where('account_id', accountId)
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .orderBy('last_activity', 'desc')
        .first();
      
      if (!session) {
        console.log(`💾 Database: [AccountId: ${accountId}] No active session found`);
        return null;
      }
      
      console.log('💾 Database: Found active session:', JSON.stringify(session, null, 2));
      
      // Load messages for this session
      const messages = await this.getChatMessages(String(session.id));
      
      // Transform to frontend format
      const transformedSession = {
        id: String(session.id),
        messages: messages,
        createdAt: session.created_at ? new Date(session.created_at).toISOString() : new Date().toISOString(),
        lastActivity: session.last_activity ? new Date(session.last_activity).toISOString() : 
                     session.updated_at ? new Date(session.updated_at).toISOString() : new Date().toISOString()
      };
      
      console.log('💾 Database: Transformed active session:', JSON.stringify(transformedSession, null, 2));
      return transformedSession;
    } catch (error) {
      console.error('💾 Database: Error getting active session:', error);
      return null;
    }
  }

  static async createTestChatSession(accountId?: string): Promise<TestChatSession> {
    console.log('💾 Database: Creating test chat session...');
    
    try {
      // Get default account if not provided
      if (!accountId) {
        const firstAccount = await db('accounts').select('id').orderBy('created_at', 'asc').first();
        accountId = firstAccount?.id;
        console.log('💾 Using default account for test chat:', accountId);
      }
      
      const [insertResult] = await db('test_chat_sessions')
        .insert({
          session_type: 'test',
          account_id: accountId
        })
        .returning('id');
      
      console.log('💾 Database: Insert result:', insertResult, 'Type:', typeof insertResult);
      
      let recordId: number;
      if (typeof insertResult === 'number') {
        recordId = insertResult;
      } else if (insertResult && typeof insertResult === 'object' && insertResult.id) {
        recordId = insertResult.id;
      } else {
        throw new Error('Could not determine record ID from insert result');
      }
      
      console.log('💾 Database: Determined record ID:', recordId);
      
      // Fetch the full record
      const created = await db('test_chat_sessions')
        .where('id', recordId)
        .first();
      
      console.log('💾 Database: Full created record:', JSON.stringify(created, null, 2));
      
      if (!created) {
        throw new Error(`Could not find created record with ID: ${recordId}`);
      }
      
      // Transform database response to match frontend interface
      const transformedSession = {
        id: String(created.id), // Convert number to string for frontend compatibility
        messages: [],
        createdAt: created.created_at ? new Date(created.created_at).toISOString() : new Date().toISOString(),
        lastActivity: created.last_activity ? new Date(created.last_activity).toISOString() : 
                     created.updated_at ? new Date(created.updated_at).toISOString() : new Date().toISOString()
      };
      
      console.log('💾 Database: Transformed session:', JSON.stringify(transformedSession, null, 2));
      
      return transformedSession;
    } catch (error) {
      console.error('💾 Database: Error creating test chat session:', error);
      throw error;
    }
  }

  // WhatsApp Chat Sessions
  static async createWhatsAppChatSession(whatsappNumber: string, accountId: string): Promise<TestChatSession> {
    console.log(`📱 Database: [AccountId: ${accountId}] Creating WhatsApp chat session for:`, whatsappNumber);
    
    try {
      // Check if session already exists for this WhatsApp number AND account
      const existing = await db('test_chat_sessions')
        .where('whatsapp_number', whatsappNumber)
        .andWhere('session_type', 'whatsapp')
        .andWhere('account_id', accountId)
        .first();
      
      if (existing) {
        console.log('📱 WhatsApp session already exists for', whatsappNumber, '- updating activity');
        await db('test_chat_sessions')
          .where('id', existing.id)
          .update({ 
            last_activity: new Date(),
            status: 'active'
          });
        
        return {
          id: String(existing.id),
          messages: [],
          createdAt: new Date(existing.created_at).toISOString(),
          lastActivity: new Date().toISOString()
        };
      }
      
      const [insertResult] = await db('test_chat_sessions')
        .insert({
          session_type: 'whatsapp',
          whatsapp_number: whatsappNumber,
          display_name: whatsappNumber, // Use phone number as display name
          status: 'active',
          account_id: accountId
        })
        .returning('id');
      
      let recordId: number;
      if (typeof insertResult === 'number') {
        recordId = insertResult;
      } else if (insertResult && typeof insertResult === 'object' && insertResult.id) {
        recordId = insertResult.id;
      } else {
        throw new Error('Could not determine record ID from insert result');
      }
      
      console.log('📱 Database: Created WhatsApp chat session with ID:', recordId);
      
      return {
        id: String(recordId),
        messages: [],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error('📱 Database: Error creating WhatsApp chat session:', error);
      throw error;
    }
  }

  // DEPRECATED: Use createWhatsAppChatSession with accountId instead
  static async createWhatsAppChatSessionForAccount(whatsappNumber: string, accountId: string): Promise<TestChatSession> {
    console.log('📱 Database: Creating WhatsApp chat session for:', whatsappNumber, 'with account:', accountId);
    
    try {
      // Check if session already exists for this WhatsApp number
      const existing = await db('test_chat_sessions')
        .where('whatsapp_number', whatsappNumber)
        .andWhere('session_type', 'whatsapp')
        .first();
      
      if (existing) {
        console.log('📱 WhatsApp session already exists for', whatsappNumber, '- updating activity and account');
        await db('test_chat_sessions')
          .where('id', existing.id)
          .update({ 
            last_activity: new Date(),
            status: 'active',
            account_id: accountId // Update to correct account
          });
        
        return {
          id: String(existing.id),
          messages: [],
          createdAt: new Date(existing.created_at).toISOString(),
          lastActivity: new Date().toISOString()
        };
      }
      
      const [insertResult] = await db('test_chat_sessions')
        .insert({
          session_type: 'whatsapp',
          whatsapp_number: whatsappNumber,
          display_name: whatsappNumber, // Use phone number as display name
          status: 'active',
          account_id: accountId
        })
        .returning('id');
      
      let recordId: number;
      if (typeof insertResult === 'number') {
        recordId = insertResult;
      } else if (insertResult && typeof insertResult === 'object' && insertResult.id) {
        recordId = insertResult.id;
      } else {
        throw new Error('Could not determine record ID from insert result');
      }
      
      // Fetch the full record
      const created = await db('test_chat_sessions')
        .where('id', recordId)
        .first();
      
      console.log('📱 WhatsApp chat session created:', JSON.stringify(created, null, 2));
      
      if (!created) {
        throw new Error(`Could not find created record with ID: ${recordId}`);
      }
      
      return {
        id: String(created.id),
        messages: [],
        createdAt: created.created_at ? new Date(created.created_at).toISOString() : new Date().toISOString(),
        lastActivity: created.last_activity ? new Date(created.last_activity).toISOString() : 
                     created.updated_at ? new Date(created.updated_at).toISOString() : new Date().toISOString()
      };
    } catch (error) {
      console.error('📱 Database: Error creating WhatsApp chat session for account:', error);
      throw error;
    }
  }

  static async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const messages = await db('chat_messages')
      .where('session_id', parseInt(sessionId, 10))
      .orderBy('timestamp', 'asc');
    
    console.log(`💾 Database.getChatMessages(${sessionId}):`, {
      count: messages.length,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: (m.content || '').substring(0, 40) + '...',
        metadata: m.metadata
      }))
    });
    
    return messages;
  }

  static async addChatMessage(message: DbChatMessage): Promise<ChatMessage> {
    const messageToInsert = {
      ...message,
      session_id: parseInt(message.session_id, 10) // Convert string to number for database
    };

    const [created] = await db('chat_messages')
      .insert(messageToInsert)
      .returning('*');
    
    // Update session's last_activity when a new message is added
    await db('test_chat_sessions')
      .where('id', parseInt(message.session_id, 10))
      .update({ 
        last_activity: new Date(),
        status: 'active' // Ensure session is active when messages are added
      });
    
    return created;
  }

  static async updateChatMessage(id: string, updates: Partial<DbChatMessage>): Promise<ChatMessage | null> {
    const dbUpdates: any = {};
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.timestamp !== undefined) dbUpdates.timestamp = updates.timestamp;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;

    const [updated] = await db('chat_messages')
      .where('id', parseInt(id, 10))
      .update(dbUpdates)
      .returning('*');
    return updated || null;
  }

  static async updateChatSessionActivity(sessionId: string): Promise<void> {
    await db('test_chat_sessions')
      .where('id', parseInt(sessionId, 10))
      .update({ last_activity: new Date() });
  }

  // Services operations
  static async getServices(accountId: string): Promise<Service[]> {
    try {
      console.log(`[AccountId: ${accountId}] Fetching services...`);
      const results = await db('services')
        .where({ account_id: accountId, is_active: true })
        .orderBy('sort_order', 'asc')
        .orderBy('name', 'asc');
      
      return results.map(service => ({
        id: service.id,
        botConfigId: service.bot_config_id,
        name: service.name,
        description: service.description,
        price: parseFloat(service.price),
        currency: service.currency,
        durationMinutes: service.duration_minutes,
        isActive: Boolean(service.is_active),
        sortOrder: service.sort_order,
        createdAt: new Date(service.created_at),
        updatedAt: new Date(service.updated_at)
      }));
    } catch (error) {
      console.error('Error getting services:', error);
      throw error;
    }
  }

  static async createService(accountId: string, serviceData: CreateServiceRequest): Promise<Service> {
    console.log(`[AccountId: ${accountId}] Creating service...`);
    const [created] = await db('services')
      .insert({
        account_id: accountId,
        bot_config_id: serviceData.botConfigId || null, // Optional bot_config_id
        name: serviceData.name,
        description: serviceData.description,
        price: serviceData.price,
        currency: serviceData.currency || 'EUR',
        duration_minutes: serviceData.durationMinutes,
        sort_order: serviceData.sortOrder || 0,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    return {
      id: created.id,
      botConfigId: created.bot_config_id,
      name: created.name,
      description: created.description,
      price: parseFloat(created.price),
      currency: created.currency,
      durationMinutes: created.duration_minutes,
      isActive: created.is_active,
      sortOrder: created.sort_order,
      createdAt: new Date(created.created_at),
      updatedAt: new Date(created.updated_at)
    };
  }

  static async updateService(serviceId: string, updates: Partial<CreateServiceRequest>): Promise<Service> {
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    
    dbUpdates.updated_at = new Date();

    await db('services')
      .where('id', serviceId)
      .update(dbUpdates);

    const [updated] = await db('services').where('id', serviceId);
    
    return {
      id: updated.id,
      botConfigId: updated.bot_config_id,
      name: updated.name,
      description: updated.description,
      price: parseFloat(updated.price),
      currency: updated.currency,
      durationMinutes: updated.duration_minutes,
      isActive: updated.is_active,
      sortOrder: updated.sort_order,
      createdAt: new Date(updated.created_at),
      updatedAt: new Date(updated.updated_at)
    };
  }

  static async deleteService(serviceId: string): Promise<void> {
    await db('services')
      .where('id', serviceId)
      .update({ is_active: false, updated_at: new Date() });
  }

  // ================== STATS & ANALYTICS ==================

  /**
   * Get appointment statistics for dashboard
   */
  static async getAppointmentStats(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const baseQuery = db('appointments')
      .where('account_id', accountId)
      .modify((qb: any) => {
        if (filters.startDate) qb.where('created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('created_at', '<=', filters.endDate);
      });

    const [
      total,
      confirmed,
      cancelled,
      noshow,
      completed,
      pending,
      uniqueCustomers
    ] = await Promise.all([
      baseQuery.clone().count('* as count'),
      baseQuery.clone().whereIn('status', ['confirmed', 'booked']).count('* as count'),
      baseQuery.clone().where('status', 'cancelled').count('* as count'),
      baseQuery.clone().where('status', 'noshow').count('* as count'),
      baseQuery.clone().where('status', 'completed').count('* as count'),
      baseQuery.clone().where('status', 'pending').count('* as count'),
      baseQuery.clone().countDistinct('customer_phone as count')
    ]);

    const totalCount = parseInt(total[0].count as string) || 0;
    const confirmedCount = parseInt(confirmed[0].count as string) || 0;
    const cancelledCount = parseInt(cancelled[0].count as string) || 0;
    const noshowCount = parseInt(noshow[0].count as string) || 0;
    const completedCount = parseInt(completed[0].count as string) || 0;
    const pendingCount = parseInt(pending[0].count as string) || 0;
    const uniqueCustomersCount = parseInt(uniqueCustomers[0].count as string) || 0;

    return {
      total: totalCount,
      confirmed: confirmedCount,
      cancelled: cancelledCount,
      noshow: noshowCount,
      completed: completedCount,
      pending: pendingCount,
      conversionRate: totalCount > 0 ? ((confirmedCount / totalCount) * 100).toFixed(2) : '0.00',
      noshowRate: totalCount > 0 ? ((noshowCount / totalCount) * 100).toFixed(2) : '0.00',
      uniqueCustomers: uniqueCustomersCount
    };
  }

  /**
   * Get chat statistics
   */
  static async getChatStats(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const sessionQuery = db('test_chat_sessions')
      .where('account_id', accountId)
      .modify((qb: any) => {
        if (filters.startDate) qb.where('created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('created_at', '<=', filters.endDate);
      });

    const [totalSessions, whatsappSessions, avgMessages] = await Promise.all([
      sessionQuery.clone().count('* as count'),
      sessionQuery.clone().where('session_type', 'whatsapp').count('* as count'),
      db('chat_messages')
        .join('test_chat_sessions', 'chat_messages.session_id', 'test_chat_sessions.id')
        .where('test_chat_sessions.account_id', accountId)
        .count('chat_messages.id as count')
    ]);

    const totalSessionsCount = parseInt(totalSessions[0].count as string) || 0;
    const whatsappSessionsCount = parseInt(whatsappSessions[0].count as string) || 0;
    const totalMessages = parseInt(avgMessages[0].count as string) || 0;

    return {
      totalSessions: totalSessionsCount,
      whatsappSessions: whatsappSessionsCount,
      testSessions: totalSessionsCount - whatsappSessionsCount,
      avgMessagesPerSession: totalSessionsCount > 0 ? (totalMessages / totalSessionsCount).toFixed(1) : '0'
    };
  }

  /**
   * Get red flag statistics
   */
  static async getRedFlagStats(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const dbClient = db.client.config.client;
    
    let redFlagsQuery = db('chat_messages')
      .join('test_chat_sessions', 'chat_messages.session_id', 'test_chat_sessions.id')
      .where('test_chat_sessions.account_id', accountId)
      .modify((qb: any) => {
        if (filters.startDate) qb.where('chat_messages.timestamp', '>=', filters.startDate);
        if (filters.endDate) qb.where('chat_messages.timestamp', '<=', filters.endDate);
      });

    // Different JSON query syntax for PostgreSQL vs SQLite
    if (dbClient === 'pg' || dbClient === 'postgresql') {
      redFlagsQuery = redFlagsQuery.whereRaw("metadata::jsonb @> '{\"isFlagged\": true}'");
    } else {
      // SQLite: Use JSON_EXTRACT
      redFlagsQuery = redFlagsQuery.whereRaw("JSON_EXTRACT(metadata, '$.isFlagged') = 1");
    }

    const totalMessagesQuery = db('chat_messages')
      .join('test_chat_sessions', 'chat_messages.session_id', 'test_chat_sessions.id')
      .where('test_chat_sessions.account_id', accountId);

    const [redFlags, totalMessages, recentFlags] = await Promise.all([
      redFlagsQuery.clone().count('chat_messages.id as count'),
      totalMessagesQuery.count('chat_messages.id as count'),
      redFlagsQuery.clone()
        .select(
          'chat_messages.id',
          'chat_messages.timestamp',
          'chat_messages.content',
          'chat_messages.metadata',
          'test_chat_sessions.whatsapp_number'
        )
        .orderBy('chat_messages.timestamp', 'desc')
        .limit(10)
    ]);

    const redFlagsCount = parseInt(redFlags[0].count as string) || 0;
    const totalMessagesCount = parseInt(totalMessages[0].count as string) || 0;

    return {
      total: redFlagsCount,
      rate: totalMessagesCount > 0 ? ((redFlagsCount / totalMessagesCount) * 100).toFixed(2) : '0.00',
      recentFlags: recentFlags.map((flag: any) => {
        let metadata: any = {};
        try {
          metadata = typeof flag.metadata === 'string' ? JSON.parse(flag.metadata) : flag.metadata;
        } catch (e) {
          console.error('Failed to parse metadata:', e);
        }
        return {
          id: flag.id,
          timestamp: flag.timestamp,
          customerPhone: flag.whatsapp_number || 'N/A',
          content: flag.content,
          sentiment: metadata.userSentiment || 'N/A'
        };
      })
    };
  }

  /**
   * Get revenue statistics
   */
  static async getRevenueStats(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const revenueQuery = db('appointments')
      .join('services', 'appointments.appointment_type', 'services.id')
      .where('appointments.account_id', accountId)
      .whereIn('appointments.status', ['confirmed', 'booked', 'completed'])
      .modify((qb: any) => {
        if (filters.startDate) qb.where('appointments.created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('appointments.created_at', '<=', filters.endDate);
      });

    const [totalRevenue, byService] = await Promise.all([
      revenueQuery.clone().sum('services.price as total'),
      revenueQuery.clone()
        .select('services.name', 'services.currency')
        .sum('services.price as revenue')
        .count('appointments.id as bookings')
        .groupBy('services.id', 'services.name', 'services.currency')
        .orderBy('revenue', 'desc')
    ]);

    return {
      total: parseFloat(totalRevenue[0]?.total as string) || 0,
      byService: byService.map((s: any) => ({
        name: s.name,
        revenue: parseFloat(s.revenue as string) || 0,
        bookings: parseInt(s.bookings as string) || 0,
        currency: s.currency
      }))
    };
  }

  /**
   * Get top services by booking count
   */
  static async getTopServices(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const services = await db('services')
      .select(
        'services.name',
        'services.id'
      )
      .count('appointments.id as bookingCount')
      .leftJoin('appointments', function(this: any) {
        this.on('services.id', '=', 'appointments.appointment_type')
          .andOn('appointments.account_id', '=', db.raw('?', [accountId]));
      })
      .join('bot_configs', 'services.bot_config_id', 'bot_configs.id')
      .modify((qb: any) => {
        if (filters.startDate) qb.where('appointments.created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('appointments.created_at', '<=', filters.endDate);
      })
      .groupBy('services.id', 'services.name')
      .orderBy('bookingCount', 'desc')
      .limit(10);

    return services.map((s: any) => ({
      name: s.name,
      bookingCount: parseInt(s.bookingCount as string) || 0
    }));
  }

  /**
   * Get weekday distribution
   */
  static async getWeekdayDistribution(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const dbClient = db.client.config.client;
    const extractFunction = (dbClient === 'pg' || dbClient === 'postgresql') 
      ? "EXTRACT(DOW FROM datetime)" 
      : "CAST(strftime('%w', datetime) AS INTEGER)";

    const distribution = await db('appointments')
      .select(db.raw(`${extractFunction} as day_of_week`))
      .count('* as count')
      .where('account_id', accountId)
      .modify((qb: any) => {
        if (filters.startDate) qb.where('created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('created_at', '<=', filters.endDate);
      })
      .groupBy('day_of_week')
      .orderBy('day_of_week');

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return distribution.map((d: any) => ({
      dayOfWeek: parseInt(d.day_of_week as string),
      dayName: dayNames[parseInt(d.day_of_week as string)],
      count: parseInt(d.count as string) || 0
    }));
  }

  /**
   * Get hour distribution for heatmap
   */
  static async getHourDistribution(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const dbClient = db.client.config.client;
    const extractFunction = (dbClient === 'pg' || dbClient === 'postgresql')
      ? "EXTRACT(HOUR FROM datetime)"
      : "CAST(strftime('%H', datetime) AS INTEGER)";

    const distribution = await db('appointments')
      .select(db.raw(`${extractFunction} as hour`))
      .count('* as count')
      .where('account_id', accountId)
      .modify((qb: any) => {
        if (filters.startDate) qb.where('created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('created_at', '<=', filters.endDate);
      })
      .groupBy('hour')
      .orderBy('hour');

    return distribution.map((d: any) => ({
      hour: parseInt(d.hour as string),
      count: parseInt(d.count as string) || 0
    }));
  }

  /**
   * Get top customers
   */
  static async getTopCustomers(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const customers = await db('appointments')
      .select(
        'customer_name as name',
        'customer_phone as phone'
      )
      .count('* as bookings')
      .max('datetime as lastBooking')
      .sum('duration as totalDuration')
      .where('account_id', accountId)
      .modify((qb: any) => {
        if (filters.startDate) qb.where('created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('created_at', '<=', filters.endDate);
      })
      .groupBy('customer_phone', 'customer_name')
      .orderBy('bookings', 'desc')
      .limit(10);

    // Calculate revenue per customer
    const customersWithRevenue = await Promise.all(customers.map(async (customer: any) => {
      const revenue = await db('appointments')
        .join('services', 'appointments.appointment_type', 'services.id')
        .where('appointments.customer_phone', customer.phone)
        .where('appointments.account_id', accountId)
        .whereIn('appointments.status', ['confirmed', 'booked', 'completed'])
        .sum('services.price as totalRevenue')
        .first();

      return {
        name: customer.name,
        phone: customer.phone,
        bookings: parseInt(customer.bookings as string) || 0,
        totalRevenue: parseFloat(revenue?.totalRevenue as string) || 0,
        lastBooking: customer.lastBooking
      };
    }));

    return customersWithRevenue;
  }

  /**
   * Get service statistics
   */
  static async getServiceStats(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
  }) {
    const services = await db('services')
      .select(
        'services.id',
        'services.name',
        'services.price',
        'services.currency',
        'services.duration_minutes'
      )
      .count('appointments.id as bookingCount')
      .sum('services.price as totalRevenue')
      .leftJoin('appointments', function(this: any) {
        this.on('services.id', '=', 'appointments.appointment_type')
          .andOn('appointments.account_id', '=', db.raw('?', [accountId]))
          .andOn(function(this: any) {
            this.on('appointments.status', '=', db.raw('?', ['confirmed']))
              .orOn('appointments.status', '=', db.raw('?', ['booked']))
              .orOn('appointments.status', '=', db.raw('?', ['completed']));
          });
      })
      .join('bot_configs', 'services.bot_config_id', 'bot_configs.id')
      .modify((qb: any) => {
        if (filters.startDate) qb.where('appointments.created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('appointments.created_at', '<=', filters.endDate);
      })
      .groupBy('services.id', 'services.name', 'services.price', 'services.currency', 'services.duration_minutes')
      .orderBy('bookingCount', 'desc');

    return services.map((s: any) => ({
      id: s.id,
      name: s.name,
      bookingCount: parseInt(s.bookingCount as string) || 0,
      totalRevenue: parseFloat(s.totalRevenue as string) || 0,
      avgDuration: s.duration_minutes || 0
    }));
  }

  /**
   * Get timeline data for charts
   */
  static async getTimelineData(accountId: string, filters: {
    startDate?: string;
    endDate?: string;
    period: 'day' | 'week' | 'month';
  }) {
    const dbClient = db.client.config.client;
    
    // Determine date truncation function based on DB client and period
    let dateTrunc: string;
    if (dbClient === 'pg' || dbClient === 'postgresql') {
      dateTrunc = `DATE_TRUNC('${filters.period}', appointments.created_at)`;
    } else {
      // SQLite: Use date() for day, and custom logic for week/month
      if (filters.period === 'day') {
        dateTrunc = "DATE(appointments.created_at)";
      } else if (filters.period === 'week') {
        dateTrunc = "DATE(appointments.created_at, 'weekday 0', '-6 days')";
      } else {
        dateTrunc = "DATE(appointments.created_at, 'start of month')";
      }
    }

    const bookingsTimeline = await db('appointments')
      .select(db.raw(`${dateTrunc} as period`))
      .count('* as count')
      .where('account_id', accountId)
      .modify((qb: any) => {
        if (filters.startDate) qb.where('created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('created_at', '<=', filters.endDate);
      })
      .groupBy('period')
      .orderBy('period');

    const cancellationsTimeline = await db('appointments')
      .select(db.raw(`${dateTrunc} as period`))
      .count('* as count')
      .where('account_id', accountId)
      .where('status', 'cancelled')
      .modify((qb: any) => {
        if (filters.startDate) qb.where('created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('created_at', '<=', filters.endDate);
      })
      .groupBy('period')
      .orderBy('period');

    const revenueTimeline = await db('appointments')
      .join('services', 'appointments.appointment_type', 'services.id')
      .select(db.raw(`${dateTrunc} as period`))
      .sum('services.price as revenue')
      .where('appointments.account_id', accountId)
      .whereIn('appointments.status', ['confirmed', 'booked', 'completed'])
      .modify((qb: any) => {
        if (filters.startDate) qb.where('appointments.created_at', '>=', filters.startDate);
        if (filters.endDate) qb.where('appointments.created_at', '<=', filters.endDate);
      })
      .groupBy('period')
      .orderBy('period');

    // Combine all timelines
    const allPeriods = new Set([
      ...bookingsTimeline.map((b: any) => b.period),
      ...cancellationsTimeline.map((c: any) => c.period),
      ...revenueTimeline.map((r: any) => r.period)
    ]);

    const labels: string[] = [];
    const bookings: number[] = [];
    const cancellations: number[] = [];
    const revenue: number[] = [];

    Array.from(allPeriods).sort().forEach((period: any) => {
      const periodStr = period instanceof Date ? period.toISOString().split('T')[0] : String(period);
      labels.push(periodStr);
      
      const bookingData = bookingsTimeline.find((b: any) => String(b.period) === periodStr);
      const cancellationData = cancellationsTimeline.find((c: any) => String(c.period) === periodStr);
      const revenueData = revenueTimeline.find((r: any) => String(r.period) === periodStr);
      
      bookings.push(parseInt(bookingData?.count as string) || 0);
      cancellations.push(parseInt(cancellationData?.count as string) || 0);
      revenue.push(parseFloat(revenueData?.revenue as string) || 0);
    });

    return {
      labels,
      bookings,
      cancellations,
      revenue
    };
  }

  // Language Settings operations
  static async getLanguageSettings(accountId: string): Promise<any[]> {
    try {
      console.log(`[AccountId: ${accountId}] Fetching language settings...`);
      const languages = await db('language_settings')
        .where('account_id', accountId)
        .orderBy('language_name', 'asc');
      
      return languages;
    } catch (error) {
      console.error('Error fetching language settings:', error);
      return [];
    }
  }

  static async getCurrentLanguageSetting(accountId: string): Promise<any | null> {
    try {
      console.log(`[AccountId: ${accountId}] Fetching current language setting...`);
      const currentLanguage = await db('language_settings')
        .where('account_id', accountId)
        .where('is_default', true)
        .first();
      
      if (!currentLanguage) {
        // Set German as default if none set
        const germanSetting = await db('language_settings')
          .where('account_id', accountId)
          .where('language_code', 'de')
          .first();
        
        if (germanSetting) {
          await db('language_settings')
            .where('account_id', accountId)
            .where('language_code', 'de')
            .update({ is_default: true });
          
          return germanSetting;
        }
        
        return null;
      }
      
      return currentLanguage;
    } catch (error) {
      console.error('Error fetching current language setting:', error);
      return null;
    }
  }

  static async updateLanguageSetting(accountId: string, languageCode: string): Promise<void> {
    try {
      console.log(`[AccountId: ${accountId}] Updating language setting to:`, languageCode);
      
      // Set all languages for this account to not default
      await db('language_settings')
        .where('account_id', accountId)
        .update({ is_default: false });
      
      // Set the selected language as default
      await db('language_settings')
        .where('account_id', accountId)
        .where('language_code', languageCode)
        .update({ is_default: true });
      
      console.log(`✅ [AccountId: ${accountId}] Language updated to ${languageCode}`);
    } catch (error) {
      console.error('Error updating language setting:', error);
      throw error;
    }
  }
}

export default db; 