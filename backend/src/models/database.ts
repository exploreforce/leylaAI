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

  // Bot Config operations
  static async getBotConfig(): Promise<BotConfig | null> {
    const result = await db('bot_configs')
      .where('is_active', true)
      .first();
    
    if (!result) return null;
    
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
      
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at)
    };
  }

  static async updateBotConfig(updates: Partial<BotConfig>): Promise<BotConfig> {
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
    
    dbUpdates.updated_at = new Date();

    await db('bot_configs')
      .where('is_active', true)
      .update(dbUpdates);

    // Return the updated config
    return this.getBotConfig() as Promise<BotConfig>;
  }

  // Appointment operations (NO DATE OBJECTS - STRING ONLY!)
  static async getAppointments(filters: {
    startDateStr?: string;
    endDateStr?: string;
    status?: string;
    accountId?: string;
  } = {}): Promise<Appointment[]> {
    try {
      console.log('🔍 Database.getAppointments called with STRING filters:', {
        startDateStr: filters.startDateStr,
        endDateStr: filters.endDateStr,
        status: filters.status
      });

      let query = db('appointments').select('*');
      
      if (filters.startDateStr) {
        // Use date string directly with 00:00 time
        const startDateTimeStr = `${filters.startDateStr} 00:00`;
        console.log('🔍 Adding startDate filter (LOCAL STRING): datetime >=', startDateTimeStr);
        query = query.where('datetime', '>=', startDateTimeStr);
      }
      
      if (filters.endDateStr) {
        // Use date string directly with 23:59 time
        const endDateTimeStr = `${filters.endDateStr} 23:59`;
        console.log('🔍 Adding endDate filter (LOCAL STRING): datetime <=', endDateTimeStr);
        query = query.where('datetime', '<=', endDateTimeStr);
      }
      if (filters.status) {
        console.log('🔍 Adding status filter:', filters.status);
        query = query.where('status', filters.status);
      }
      if (filters.accountId) {
        console.log('🔍 Adding account filter:', filters.accountId);
        query = query.where('account_id', filters.accountId);
      }
      
      console.log('🔍 Executing query:', query.toString());
      
      const results = await query.orderBy('datetime', 'asc');
      
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
        accountId: row.account_id, // Include account_id for multi-tenant support
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
    
    const [created] = await db('appointments')
      .insert(appointment)
      .returning('*');
    
    console.log('📝 Database.createAppointment result:', {
      id: created.id,
      datetime: created.datetime,
      datetimeType: typeof created.datetime
    });
    
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
  }

  static async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    console.log('🔄 Database.updateAppointment called:', {
      id,
      updates,
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

    const [updated] = await db('appointments')
      .where('id', id)
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
  static async getAvailabilityConfig(): Promise<AvailabilityConfig | null> {
    try {
      const result = await db('availability_configs')
        .where('is_active', true)
        .first();
      
      if (!result) {
        return null;
      }
      
      try {
        result.weekly_schedule = JSON.parse(result.weekly_schedule || '{}');
      } catch (jsonError) {
        console.error('Error parsing weekly_schedule JSON:', jsonError);
        result.weekly_schedule = {};
      }
      
      // Load blackout dates from separate table
      const blackoutDates = await this.getBlackoutDates();
      
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

  static async updateAvailabilityConfig(weeklySchedule: any): Promise<AvailabilityConfig> {
    const [updated] = await db('availability_configs')
      .where('is_active', true)
      .update({
        weekly_schedule: JSON.stringify(weeklySchedule),
        updated_at: new Date()
      })
      .returning('*');
    
    updated.weekly_schedule = JSON.parse(updated.weekly_schedule);
    return updated;
  }

  // Blackout dates operations
  static async getBlackoutDates(startDate?: Date, endDate?: Date): Promise<BlackoutDate[]> {
    try {
      let query = db('blackout_dates').select('*');
      
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

  static async addBlackoutDate(blackoutDate: Omit<BlackoutDate, 'id' | 'createdAt' | 'updatedAt'>): Promise<BlackoutDate> {
    const [created] = await db('blackout_dates')
      .insert(blackoutDate)
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
  static async getActiveTestChatSession(): Promise<TestChatSession | null> {
    console.log('💾 Database: Getting active test chat session...');
    
    try {
      // Get the most recent session (within last 24 hours to keep it reasonable)
      const session = await db('test_chat_sessions')
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .orderBy('last_activity', 'desc')
        .first();
      
      if (!session) {
        console.log('💾 Database: No active session found');
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
  static async createWhatsAppChatSession(whatsappNumber: string): Promise<TestChatSession> {
    console.log('📱 Database: Creating WhatsApp chat session for:', whatsappNumber);
    
    try {
      // Check if session already exists for this WhatsApp number
      const existing = await db('test_chat_sessions')
        .where('whatsapp_number', whatsappNumber)
        .andWhere('session_type', 'whatsapp')
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
          status: 'active'
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
      console.error('📱 Database: Error creating WhatsApp chat session:', error);
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
  static async getServices(botConfigId: string): Promise<Service[]> {
    try {
      const results = await db('services')
        .where({ bot_config_id: botConfigId, is_active: true })
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

  static async createService(botConfigId: string, serviceData: CreateServiceRequest): Promise<Service> {
    const [created] = await db('services')
      .insert({
        bot_config_id: botConfigId,
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
}

export default db; 