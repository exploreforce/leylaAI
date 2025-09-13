import OpenAI from 'openai';
import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { ChatMessage } from '../types';
import { Database } from '../models/database';
import { getBusinessDaySlots, isTimeSlotAvailable } from '../utils';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Structured Output Schema ---
const botResponseSchema = {
  type: "object" as const,
  properties: {
    chat_response: {
      type: "string" as const,
      description: "Chat answer from the system. This is what will be shown to the user."
    },
    is_flagged: {
      type: "boolean" as const,
      description: "Has the user's message crossed a red line? True if flagged."
    },
    user_sentiment: {
      type: "string" as const,
      description: "Interpretation of the user's emotional state."
    },
    user_information: {
      type: "string" as const,
      description: "Summary of the most important information about the user to carry across turns."
    },
    user_language: {
      type: "string" as const,
      description: "ISO 639-1 language code the user is writing in (e.g., 'de', 'en')."
    }
  },
  required: [
    "chat_response",
    "is_flagged",
    "user_sentiment",
    "user_information",
    "user_language"
  ],
  additionalProperties: false
};

// Interface for the structured response
interface BotResponse {
  chat_response: string;
  is_flagged: boolean;
  user_sentiment: string;
  user_information: string;
  user_language: string;
}

// --- Tool Definitions for OpenAI Function Calling ---

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'checkAvailability',
      description: 'Checks for available appointment slots on a given date.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date to check for availability, in YYYY-MM-DD format.',
          },
          duration: {
            type: 'number',
            description: 'The duration of the appointment in minutes.',
          },
        },
        required: ['date', 'duration'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bookAppointment',
      description: 'Books a new appointment with the customer.',
      parameters: {
        type: 'object',
        properties: {
          customerName: { type: 'string', description: "The customer's full name." },
          customerPhone: { type: 'string', description: "The customer's phone number." },
          customerEmail: { type: 'string', description: "The customer's email address (optional)." },
          datetime: {
            type: 'string',
            description: 'The appointment start time in ISO 8601 format (e.g., 2024-07-25T14:30:00Z).',
          },
          duration: {
            type: 'number',
            description: 'The duration of the appointment in minutes.',
          },
          appointmentType: {
            type: 'string',
            description: 'The type/service of the appointment (e.g., "consultation", "treatment", etc.).',
          },
          notes: {
            type: 'string',
            description: 'Any additional notes for the appointment.',
          },
        },
        required: ['customerName', 'customerPhone', 'datetime', 'duration', 'appointmentType'],
      },
    },
  },
];

// --- Tool Implementation ---

const executeTool = async (toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall) => {
  const toolName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  console.log(`🤖 Executing tool: ${toolName}`, args);

  switch (toolName) {
    case 'checkAvailability':
      const { date, duration } = args;
      console.log(`🔍 Checking availability for date: ${date}, duration: ${duration} minutes`);
      
      // Check if date is in the past
      const requestedDate = new Date(date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (requestedDate < today) {
        console.log(`❌ Date ${date} is in the past`);
        return { error: `Cannot book appointments in the past. Today is ${today.toISOString().split('T')[0]}` };
      }
      
      const availabilityConfig = await Database.getAvailabilityConfig();
      if (!availabilityConfig) {
        console.log('❌ No availability configuration found, creating default config and using 9-17');
        
        // Create default availability config for all weekdays
        const defaultWeeklySchedule = {
          monday: { dayOfWeek: 1, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          tuesday: { dayOfWeek: 2, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          wednesday: { dayOfWeek: 3, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          thursday: { dayOfWeek: 4, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          friday: { dayOfWeek: 5, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
          saturday: { dayOfWeek: 6, isAvailable: false, timeSlots: [] },
          sunday: { dayOfWeek: 0, isAvailable: false, timeSlots: [] }
        };
        
        try {
          await Database.updateAvailabilityConfig(defaultWeeklySchedule);
          console.log('✅ Default availability config created');
        } catch (error) {
          console.error('❌ Failed to create default config:', error);
        }
        
        // Use default business hours if no config
        const allSlots = getBusinessDaySlots('09:00', '17:00', duration, 0, 1);
        const booked = await Database.getAppointments({ startDateStr: date, endDateStr: date });
        
        // Helper functions for default case
        const toHHmm = (dt: string): string => {
          const s = (dt || '').replace('T', ' ').replace('Z', ' ');
          const time = s.split(' ')[1] || '';
          return time.substring(0, 5);
        };
        
        const addMinutesToHHmm = (hhmm: string, minutesToAdd: number): string => {
          const [hhStr, mmStr] = hhmm.split(':');
          const baseMinutes = parseInt(hhStr || '0', 10) * 60 + parseInt(mmStr || '0', 10);
          const total = (baseMinutes + (minutesToAdd || 0) + 24 * 60) % (24 * 60);
          const hh = String(Math.floor(total / 60)).padStart(2, '0');
          const mm = String(total % 60).padStart(2, '0');
          return `${hh}:${mm}`;
        };
        
        const bookedSlots = booked.map(appt => {
          const start = toHHmm(String(appt.datetime));
          const end = addMinutesToHHmm(start, appt.duration || 0);
          return { start, end };
        });
        const availableSlots = allSlots.filter(slot => isTimeSlotAvailable(slot.start, slot.end, bookedSlots));
        console.log(`✅ Found ${availableSlots.length} available slots (default hours)`);
        return { availableSlots };
      }
      
      const dayOfWeek = new Date(date).getDay();
      const daySchedule = Object.values(availabilityConfig.weeklySchedule).find(d => d.dayOfWeek === dayOfWeek);

      if (!daySchedule || !daySchedule.isAvailable) {
        console.log(`❌ Day ${dayOfWeek} is not available according to schedule`);
        return { availableSlots: [] };
      }

      console.log(`✅ Day ${dayOfWeek} is available, generating slots from schedule`);
      
      // Use the actual time slots from the day schedule
      let allSlots: Array<{ start: string; end: string }> = [];
      
      if (daySchedule.timeSlots && daySchedule.timeSlots.length > 0) {
        // Generate slots for each time range in the day
        for (const timeSlot of daySchedule.timeSlots) {
          const slotsForRange = getBusinessDaySlots(timeSlot.start, timeSlot.end, duration, 0, 1);
          allSlots.push(...slotsForRange);
        }
        console.log(`📅 Generated ${allSlots.length} slots from ${daySchedule.timeSlots.length} time ranges`);
      } else {
        // Fallback to default if no time slots defined
        allSlots = getBusinessDaySlots('09:00', '17:00', duration, 0, 1);
        console.log(`📅 Generated ${allSlots.length} slots from fallback hours 9-17`);
      }
      // Helper to normalize 'YYYY-MM-DD HH:mm' or ISO to 'HH:mm'
      const toHHmm = (dt: string): string => {
        const s = (dt || '').replace('T', ' ').replace('Z', ' ');
        const time = s.split(' ')[1] || '';
        return time.substring(0, 5);
      };

      // Helper to add minutes to 'HH:mm' without Date objects
      const addMinutesToHHmm = (hhmm: string, minutesToAdd: number): string => {
        const [hhStr, mmStr] = hhmm.split(':');
        const baseMinutes = parseInt(hhStr || '0', 10) * 60 + parseInt(mmStr || '0', 10);
        const total = (baseMinutes + (minutesToAdd || 0) + 24 * 60) % (24 * 60);
        const hh = String(Math.floor(total / 60)).padStart(2, '0');
        const mm = String(total % 60).padStart(2, '0');
        return `${hh}:${mm}`;
      };

      // Use string-only filters (no Date objects)
      const booked = await Database.getAppointments({ startDateStr: date, endDateStr: date });
      const bookedSlots = booked.map(appt => {
        const start = toHHmm(String(appt.datetime));
        const end = addMinutesToHHmm(start, appt.duration || 0);
        return { start, end };
      });
      
      const availableSlots = allSlots.filter(slot => isTimeSlotAvailable(slot.start, slot.end, bookedSlots));

      return { availableSlots };

    case 'bookAppointment':
      const { customerName, customerPhone, customerEmail, datetime, duration: apptDuration, appointmentType, notes } = args;
      console.log(`📅 Booking appointment:`, { customerName, customerPhone, customerEmail, datetime, duration: apptDuration, appointmentType });
      
      // Normalize incoming datetime to local string 'YYYY-MM-DD HH:mm'
      const localDatetime = String(datetime).replace('T', ' ').replace('Z', '').slice(0, 16);
      console.log(`📅 Normalized datetime: ${datetime} → ${localDatetime}`);
      
      try {
        const newAppointment = await Database.createAppointment({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          datetime: localDatetime,
          duration: apptDuration,
          appointment_type: appointmentType,
          notes,
          status: 'booked',
        });
        console.log(`✅ Appointment created successfully:`, newAppointment.id);
        return { success: true, appointment: newAppointment };
      } catch (error) {
        console.error(`❌ Failed to create appointment:`, error);
        return { error: 'Failed to create appointment. Please try again.' };
      }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};

// --- Main AI Service Logic ---

export class AIService {
  static async getChatResponse(
    messages: ChatMessage[],
    sessionId: string
  ): Promise<ChatMessage> {
    const botConfig = await Database.getBotConfig();
    if (!botConfig) {
      throw new Error('Bot configuration not found.');
    }

    const activeSystemPrompt = botConfig.generatedSystemPrompt || botConfig.systemPrompt || 'You are a helpful AI assistant.';
    const promptType = botConfig.generatedSystemPrompt ? 'generated' : 'legacy';
    
    // Content Filter Settings
    const contentFilterEnabled = process.env.OPENAI_CONTENT_FILTER !== 'false';
    
    console.log('🤖 AI Service: Bot config loaded:', {
      promptType,
      systemPrompt: activeSystemPrompt.substring(0, 50) + '...',
      contentFilterEnabled
    });

    // Erweitere System Prompt basierend auf Einstellungen
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDateTime = new Date().toLocaleString('de-DE', { 
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long'
    });
    
    // Pull last assistant metadata to seed session memory (handle object or JSON string)
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    let lastMeta: any = (lastAssistant as any)?.metadata;
    try { if (typeof lastMeta === 'string') lastMeta = JSON.parse(lastMeta); } catch {}
    const previousUserInformation = lastMeta?.userInformation || lastMeta?.user_information || '';
    const previousUserLanguage = lastMeta?.userLanguage || lastMeta?.user_language || '';
    const previousIsFlagged = (lastMeta?.isFlagged ?? lastMeta?.is_flagged) || false;

    let extendedSystemPrompt = activeSystemPrompt + `
    
SESSION MEMORY
- Known user info: ${previousUserInformation || 'None'}
- Last user language: ${previousUserLanguage || 'unknown'}
- Last safety flag: ${previousIsFlagged ? 'true' : 'false'}

GUIDELINES
- Detect user's language and reply fully in that language
- Always return JSON matching the provided schema (no prose outside JSON)
- chat_response is what the user sees
- user_information is a concise rolling summary to carry across turns
- user_language is the detected language code (e.g., 'de', 'en')
- is_flagged true only if content crosses a red line
- user_sentiment is a short qualitative label
`;

    const systemMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: 'system',
      content: extendedSystemPrompt,
    };
    
        const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content || '',
    })).filter(msg => msg.content.trim().length > 0) as OpenAI.Chat.ChatCompletionMessageParam[];

    console.log('🤖 AI Service: Sending to OpenAI with structured outputs:', {
      systemMessage: typeof systemMessage.content === 'string' ? systemMessage.content.substring(0, 50) + '...' : 'Complex content',
      messageCount: conversationHistory.length,
      conversationHistory: conversationHistory.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content.substring(0, 50) : 'complex'}...`),
      currentDate: currentDate,
      currentDateTime: currentDateTime,
      structuredOutput: true
    });

    // OpenAI API Call mit Structured Outputs
    const apiParams: any = {
      model: process.env.OPENAI_MODEL || 'gpt-4-1106-preview', // Ensure model supports structured outputs
      messages: [systemMessage, ...conversationHistory],
      tools: tools,
      tool_choice: 'auto',
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "chat_response",
          schema: botResponseSchema,
          strict: true
        }
      }
    };
    
    // Content Filter Parameter hinzufügen (falls unterstützt vom Model)
    if (!contentFilterEnabled) {
      console.log('🔓 Content filtering disabled via environment variable');
    }
    
    const response = await openai.chat.completions.create(apiParams);

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls) {
      // Execute tools and continue conversation
      const toolResults = await Promise.all(toolCalls.map(executeTool));
      
      const toolResponseMessage: OpenAI.Chat.ChatCompletionMessageParam = {
        role: 'assistant',
        tool_calls: toolCalls,
        content: null
      };

      const toolFeedbackMessages: OpenAI.Chat.ChatCompletionMessageParam[] = toolCalls.map((toolCall, i) => ({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolCall.function.name,
        content: JSON.stringify(toolResults[i]),
      }));
      
      // Send tool results back to the model with structured outputs
      const secondApiParams: any = {
        model: process.env.OPENAI_MODEL || 'gpt-4-1106-preview',
        messages: [
          systemMessage,
          ...conversationHistory,
          toolResponseMessage,
          ...toolFeedbackMessages,
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "chat_response",
            schema: botResponseSchema,
            strict: true
          }
        }
      };
      
      if (!contentFilterEnabled) {
        console.log('🔓 Content filtering disabled for tool response');
      }
      
      const secondResponse = await openai.chat.completions.create(secondApiParams);

      const finalMessage = secondResponse.choices[0].message;
      
      // Parse structured response
      let structuredResponse: BotResponse;
      try {
        structuredResponse = JSON.parse(finalMessage.content || '{}') as BotResponse;
        console.log('🎯 Structured response received:', {
          user_language: structuredResponse.user_language,
          is_flagged: structuredResponse.is_flagged,
          user_sentiment: structuredResponse.user_sentiment,
          user_information: (structuredResponse.user_information || '').substring(0, 80) + '...'
        });
      } catch (error) {
        console.error('❌ Failed to parse structured response:', error);
        // Fallback to raw content
        structuredResponse = {
          chat_response: finalMessage.content || 'Sorry, I encountered an error processing your request.',
          user_language: 'en',
          is_flagged: false,
          user_sentiment: 'neutral',
          user_information: previousUserInformation || ''
        } as BotResponse;
      }
      
      return {
        id: '', // Will be set by the database
        role: 'assistant',
        content: structuredResponse.chat_response,
        timestamp: new Date(),
        metadata: {
          userLanguage: structuredResponse.user_language,
          isFlagged: structuredResponse.is_flagged,
          userSentiment: structuredResponse.user_sentiment,
          userInformation: structuredResponse.user_information,
          toolCalls: toolCalls.map((tc, i) => ({
            name: tc.function.name,
            parameters: JSON.parse(tc.function.arguments),
            result: toolResults[i],
            status: 'completed',
          }))
        }
      };
    } else {
      // Standard structured response
      let structuredResponse: BotResponse;
      try {
        structuredResponse = JSON.parse(responseMessage.content || '{}') as BotResponse;
        console.log('🎯 Structured response received:', {
          user_language: structuredResponse.user_language,
          is_flagged: structuredResponse.is_flagged,
          user_sentiment: structuredResponse.user_sentiment,
          user_information: (structuredResponse.user_information || '').substring(0, 80) + '...'
        });
      } catch (error) {
        console.error('❌ Failed to parse structured response:', error);
        // Fallback to raw content
        structuredResponse = {
          chat_response: responseMessage.content || 'Sorry, I encountered an error processing your request.',
          user_language: 'en',
          is_flagged: false,
          user_sentiment: 'neutral',
          user_information: previousUserInformation || ''
        } as BotResponse;
      }
      
      return {
        id: '',
        role: 'assistant',
        content: structuredResponse.chat_response,
        timestamp: new Date(),
        metadata: {
          userLanguage: structuredResponse.user_language,
          isFlagged: structuredResponse.is_flagged,
          userSentiment: structuredResponse.user_sentiment,
          userInformation: structuredResponse.user_information
        }
      };
    }
  }
} 