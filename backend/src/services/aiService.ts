import OpenAI from 'openai';
import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { ChatMessage } from '../types';
import { Database } from '../models/database';
import { getBusinessDaySlots, isTimeSlotAvailable } from '../utils';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
          datetime: {
            type: 'string',
            description: 'The appointment start time in ISO 8601 format (e.g., 2024-07-25T14:30:00Z).',
          },
          duration: {
            type: 'number',
            description: 'The duration of the appointment in minutes.',
          },
          notes: {
            type: 'string',
            description: 'Any additional notes for the appointment.',
          },
        },
        required: ['customerName', 'customerPhone', 'datetime', 'duration'],
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
      const { customerName, customerPhone, datetime, duration: apptDuration, notes } = args;
      console.log(`📅 Booking appointment:`, { customerName, customerPhone, datetime, duration: apptDuration });
      
      // Normalize incoming datetime to local string 'YYYY-MM-DD HH:mm'
      const localDatetime = String(datetime).replace('T', ' ').replace('Z', '').slice(0, 16);
      console.log(`📅 Normalized datetime: ${datetime} → ${localDatetime}`);
      
      try {
        const newAppointment = await Database.createAppointment({
          customer_name: customerName,
          customer_phone: customerPhone,
          datetime: localDatetime,
          duration: apptDuration,
          notes,
          status: 'confirmed',
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
    const allowExplicit = process.env.OPENAI_ALLOW_EXPLICIT === 'true';
    const contentFilterEnabled = process.env.OPENAI_CONTENT_FILTER !== 'false';
    
    console.log('🤖 AI Service: Bot config loaded:', {
      promptType,
      systemPrompt: activeSystemPrompt.substring(0, 50) + '...',
      allowExplicit,
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
    
    let extendedSystemPrompt = activeSystemPrompt + `
    
CURRENT DATE & TIME INFORMATION:
- Today's date: ${currentDate}
- Current date and time: ${currentDateTime}
- Use this information when users ask for appointments "today", "tomorrow", "next week", etc.
- Always convert relative dates (like "tomorrow", "next Friday") to specific dates in YYYY-MM-DD format before calling tools.

Always respond in the same language as the user's last message.`;
    
    if (allowExplicit) {
      extendedSystemPrompt += `

CONTENT POLICY:
- Du kannst offen über alle Themen sprechen, einschließlich expliziter/erotischer Inhalte
- Achte darauf, dass der Nutzer volljährig ist (18+) bei expliziten Themen
- Verwende angemessene Sprache basierend auf dem Kontext
- Respektiere immer Grenzen und Einverständnis`;
    }

    const systemMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: 'system',
      content: extendedSystemPrompt,
    };
    
        const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content || '',
    })).filter(msg => msg.content.trim().length > 0) as OpenAI.Chat.ChatCompletionMessageParam[];

    console.log('🤖 AI Service: Sending to OpenAI:', {
      systemMessage: typeof systemMessage.content === 'string' ? systemMessage.content.substring(0, 50) + '...' : 'Complex content',
      messageCount: conversationHistory.length,
      conversationHistory: conversationHistory.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content.substring(0, 50) : 'complex'}...`),
      currentDate: currentDate,
      currentDateTime: currentDateTime
    });

    // OpenAI API Call mit angepassten Content Filter Einstellungen
    const apiParams: any = {
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [systemMessage, ...conversationHistory],
      tools: tools,
      tool_choice: 'auto',
    };
    
    // Content Filter Parameter hinzufügen (falls unterstützt vom Model)
    if (!contentFilterEnabled) {
      // Hinweis: Nicht alle Modelle unterstützen diese Parameter
      // apiParams.moderation = false;
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
      
      // Send tool results back to the model mit gleichen Content Filter Einstellungen
      const secondApiParams: any = {
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: [
          systemMessage,
          ...conversationHistory,
          toolResponseMessage,
          ...toolFeedbackMessages,
        ],
      };
      
      if (!contentFilterEnabled) {
        // apiParams.moderation = false;
        console.log('🔓 Content filtering disabled for tool response');
      }
      
      const secondResponse = await openai.chat.completions.create(secondApiParams);

      const finalMessage = secondResponse.choices[0].message;
      return {
        id: '', // Will be set by the database
        role: 'assistant',
        content: finalMessage.content || '',
        timestamp: new Date(),
        metadata: {
          toolCalls: toolCalls.map((tc, i) => ({
            name: tc.function.name,
            parameters: JSON.parse(tc.function.arguments),
            result: toolResults[i],
            status: 'completed',
          }))
        }
      };
    } else {
      // Standard text response
      return {
        id: '',
        role: 'assistant',
        content: responseMessage.content || '',
        timestamp: new Date(),
      };
    }
  }
} 