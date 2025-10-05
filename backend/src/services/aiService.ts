import OpenAI from 'openai';
import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { ChatMessage } from '../types';
import { Database, db } from '../models/database';
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

// --- Helper Functions ---

/**
 * Calculates free time blocks from business hours and booked appointments.
 * Returns continuous free time blocks (e.g., "09:00 - 12:00, 14:00 - 17:00").
 */
const calculateFreeTimeBlocks = (
  businessHours: Array<{ start: string; end: string }>,
  bookedSlots: Array<{ start: string; end: string }>
): Array<{ start: string; end: string }> => {
  if (!businessHours || businessHours.length === 0) return [];
  
  const freeBlocks: Array<{ start: string; end: string }> = [];
  
  for (const businessPeriod of businessHours) {
    let currentStart = businessPeriod.start;
    const periodEnd = businessPeriod.end;
    
    // Get all booked slots that overlap with this business period, sorted by start time
    const relevantBookings = bookedSlots
      .filter(booking => {
        return booking.start < periodEnd && booking.end > currentStart;
      })
      .sort((a, b) => a.start.localeCompare(b.start));
    
    // Build free blocks by finding gaps between bookings
    for (const booking of relevantBookings) {
      // If there's a gap before this booking, that's a free block
      if (currentStart < booking.start) {
        freeBlocks.push({ start: currentStart, end: booking.start });
      }
      
      // Move current start to end of this booking
      if (booking.end > currentStart) {
        currentStart = booking.end;
      }
    }
    
    // If there's time left after all bookings, that's also a free block
    if (currentStart < periodEnd) {
      freeBlocks.push({ start: currentStart, end: periodEnd });
    }
  }
  
  return freeBlocks;
};

// --- Tool Definitions for OpenAI Function Calling ---

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'checkAvailability',
      description: 'Checks for available appointment slots on a given date. Returns continuous time blocks (e.g., "09:00 bis 12:00"). IMPORTANT: A time block like "13:00 bis 17:00" means ANY time between 13:00 and 17:00 is available - you can book at 13:30, 14:00, 15:00, 16:30, etc. within that range.',
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
            description: 'The appointment start time in ISO 8601 format (e.g., 2024-07-25T14:30:00 or 2024-07-25T14:30). IMPORTANT: Always include the full date (YYYY-MM-DD) and time (HH:mm). If user says "tomorrow at 15:00", calculate tomorrow\'s date and format it as YYYY-MM-DDT15:00.',
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
  {
    type: 'function',
    function: {
      name: 'findAppointments',
      description: 'Finds all existing appointments for a specific customer by their phone number.',
      parameters: {
        type: 'object',
        properties: {
          customerPhone: {
            type: 'string',
            description: "The customer's phone number to search for appointments.",
          },
        },
        required: ['customerPhone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelAppointment',
      description: 'Cancels an existing appointment by its ID.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: {
            type: 'string',
            description: 'The ID of the appointment to cancel.',
          },
          reason: {
            type: 'string',
            description: 'Optional reason for cancellation.',
          },
        },
        required: ['appointmentId'],
      },
    },
  },
];

// --- Tool Implementation ---

const executeTool = async (
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  accountId: string | null = null
) => {
  const toolName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 TOOL CALL START: ${toolName}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📋 Tool ID: ${toolCall.id}`);
  console.log(`👤 Account ID: ${accountId || 'N/A'}`);
  console.log(`📥 Parameters:`, JSON.stringify(args, null, 2));

  switch (toolName) {
    case 'checkAvailability':
      const { date, duration } = args;
      console.log(`\n📅 CHECK AVAILABILITY`);
      console.log(`   Date: ${date}`);
      console.log(`   Duration: ${duration} minutes`);
      console.log(`   Account: ${accountId || 'N/A'}`);
      
      // Check if date is in the past
      const requestedDate = new Date(date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (requestedDate < today) {
        console.log(`❌ Date ${date} is in the past`);
        return { error: `Cannot book appointments in the past. Today is ${today.toISOString().split('T')[0]}` };
      }
      
      // Check if requested date is today
      const isToday = requestedDate.getTime() === today.getTime();
      
      // Get current time in HH:mm format (for filtering past time slots if today)
      const nowTime = new Date();
      const currentTimeHHmm = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`;
      console.log(`⏰ Current time: ${currentTimeHHmm}, isToday: ${isToday}`);
      
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
        
        // Use default business hours if no config (09:00 - 17:00)
        const businessHours = [{ start: '09:00', end: '17:00' }];
        const booked = await Database.getAppointments({ 
          startDateStr: date, 
          endDateStr: date,
          accountId: accountId || undefined
        });
        
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
        
        console.log(`📅 Found ${bookedSlots.length} booked appointments on ${date} (default hours)`);
        
        // Calculate free time blocks directly from business hours and bookings
        let freeBlocks = calculateFreeTimeBlocks(businessHours, bookedSlots);
        console.log(`✅ Calculated ${freeBlocks.length} free time blocks (default hours)`);
        
        // Adjust time blocks for today to only show remaining time
        if (isToday) {
          freeBlocks = freeBlocks
            .filter(block => {
              // Only keep blocks that haven't completely ended yet
              return block.end > currentTimeHHmm;
            })
            .map(block => {
              // If block has already started, adjust start time to current time
              if (block.start < currentTimeHHmm) {
                return { start: currentTimeHHmm, end: block.end };
              }
              return block;
            });
          console.log(`⏰ Adjusted for today - ${freeBlocks.length} time blocks still available after ${currentTimeHHmm}`);
        }
        
        return { 
          availableSlots: freeBlocks,
          message: freeBlocks.length > 0 
            ? `Ich habe folgende freie Zeitfenster: ${freeBlocks.map((block: { start: string; end: string }) => `${block.start} bis ${block.end}`).join(', ')}. WICHTIG: Du kannst JEDE Uhrzeit innerhalb dieser Zeitfenster buchen. Zum Beispiel: Wenn "13:00 bis 17:00" verfügbar ist, dann sind auch 13:30, 14:00, 15:00, 16:00, etc. möglich!`
            : isToday 
              ? 'Leider habe ich heute keine freien Zeiten mehr. Möchten Sie einen Termin für morgen oder einen anderen Tag?'
              : 'Leider habe ich an diesem Tag keine freien Zeiten.'
        };
      }
      
      const dayOfWeek = new Date(date).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      console.log(`🔍 DEBUG: dayOfWeek=${dayOfWeek}, dayName="${dayName}"`);
      console.log(`🔍 DEBUG: weeklySchedule type:`, typeof availabilityConfig.weeklySchedule);
      console.log(`🔍 DEBUG: weeklySchedule content:`, JSON.stringify(availabilityConfig.weeklySchedule, null, 2));
      
      // Parse weeklySchedule if it's a string
      let weeklySchedule = availabilityConfig.weeklySchedule;
      if (typeof weeklySchedule === 'string') {
        try {
          weeklySchedule = JSON.parse(weeklySchedule);
          console.log(`🔍 DEBUG: Parsed weeklySchedule from string`);
        } catch (e) {
          console.error(`❌ Failed to parse weeklySchedule:`, e);
        }
      }
      
      console.log(`🔍 DEBUG: weeklySchedule keys:`, Object.keys(weeklySchedule || {}));
      console.log(`🔍 DEBUG: weeklySchedule[${dayName}]:`, weeklySchedule?.[dayName]);
      
      // Try to find schedule by dayOfWeek property first, fallback to day name key
      let daySchedule = Object.values(weeklySchedule || {}).find((d: any) => d.dayOfWeek === dayOfWeek);
      console.log(`🔍 DEBUG: daySchedule from dayOfWeek search:`, daySchedule);
      
      // Fallback: If dayOfWeek property doesn't exist, try to get by key name
      if (!daySchedule && weeklySchedule?.[dayName]) {
        daySchedule = weeklySchedule[dayName];
        console.log(`📅 Using fallback: Found schedule by day name "${dayName}"`, daySchedule);
      }

      if (!daySchedule || !daySchedule.isAvailable) {
        console.log(`❌ Day ${dayOfWeek} (${dayName}) is not available according to schedule`);
        return { 
          availableSlots: [],
          message: 'An diesem Tag ist leider geschlossen.'
        };
      }

      console.log(`✅ Day ${dayOfWeek} is available, checking for free time blocks`);
      
      // Get business hours for the day
      const businessHours = daySchedule.timeSlots && daySchedule.timeSlots.length > 0
        ? daySchedule.timeSlots
        : [{ start: '09:00', end: '17:00' }];
      
      console.log(`📅 Business hours:`, businessHours);
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

      // Get booked appointments for the day (filtered by account)
      const booked = await Database.getAppointments({ 
        startDateStr: date, 
        endDateStr: date,
        accountId: accountId || undefined
      });
      const bookedSlots = booked.map(appt => {
        const start = toHHmm(String(appt.datetime));
        const end = addMinutesToHHmm(start, appt.duration || 0);
        return { start, end };
      });
      
      console.log(`📅 Found ${bookedSlots.length} booked appointments on ${date}`);
      
      // Calculate free time blocks directly from business hours and bookings
      let freeBlocks = calculateFreeTimeBlocks(businessHours, bookedSlots);
      console.log(`✅ Calculated ${freeBlocks.length} free time blocks`);
      
      // Adjust time blocks for today to only show remaining time
      if (isToday) {
        freeBlocks = freeBlocks
          .filter(block => {
            // Only keep blocks that haven't completely ended yet
            return block.end > currentTimeHHmm;
          })
          .map(block => {
            // If block has already started, adjust start time to current time
            if (block.start < currentTimeHHmm) {
              return { start: currentTimeHHmm, end: block.end };
            }
            return block;
          });
        console.log(`⏰ Adjusted for today - ${freeBlocks.length} time blocks still available after ${currentTimeHHmm}`);
      }

      const result = { 
        availableSlots: freeBlocks,
        message: freeBlocks.length > 0 
          ? `Ich habe folgende freie Zeitfenster: ${freeBlocks.map((block: { start: string; end: string }) => `${block.start} bis ${block.end}`).join(', ')}. WICHTIG: Du kannst JEDE Uhrzeit innerhalb dieser Zeitfenster buchen. Zum Beispiel: Wenn "13:00 bis 17:00" verfügbar ist, dann sind auch 13:30, 14:00, 15:00, 16:00, etc. möglich!`
          : isToday 
            ? 'Leider habe ich heute keine freien Zeiten mehr. Möchten Sie einen Termin für morgen oder einen anderen Tag?'
            : 'Leider habe ich an diesem Tag keine freien Zeiten.'
      };
      
      console.log(`\n✅ CHECK AVAILABILITY RESULT:`);
      console.log(`   Free Blocks: ${freeBlocks.length}`);
      console.log(`   Blocks:`, JSON.stringify(freeBlocks, null, 2));
      console.log(`   Message: ${result.message.substring(0, 100)}...`);
      console.log(`${'='.repeat(80)}\n`);
      
      return result;

    case 'bookAppointment':
      const { customerName, customerPhone, customerEmail, datetime, duration: apptDuration, appointmentType, notes } = args;
      console.log(`\n📝 BOOK APPOINTMENT`);
      console.log(`   Customer: ${customerName}`);
      console.log(`   Phone: ${customerPhone}`);
      console.log(`   Email: ${customerEmail || 'N/A'}`);
      console.log(`   DateTime: ${datetime} (type: ${typeof datetime})`);
      console.log(`   Duration: ${apptDuration} minutes`);
      console.log(`   Service: ${appointmentType}`);
      console.log(`   Notes: ${notes || 'N/A'}`);
      
      // Normalize incoming datetime to local string 'YYYY-MM-DD HH:mm'
      const localDatetime = String(datetime).replace('T', ' ').replace('Z', '').slice(0, 16);
      console.log(`📅 Normalized datetime: "${datetime}" → "${localDatetime}"`);
      
      try {
        // Use the account ID from the current session
        if (!accountId) {
          console.warn('⚠️ No account found in session - creating appointment without account_id');
        } else {
          console.log(`✅ Using session account ID: ${accountId}`);
        }
        
        // Validate the appointment data
        if (!customerName || !customerPhone || !localDatetime || !apptDuration || !appointmentType) {
          console.error('❌ Missing required appointment fields:', { customerName, customerPhone, localDatetime, apptDuration, appointmentType });
          return { 
            error: 'Missing required appointment information. Please provide: customer name, phone number, date/time, duration, and service type.',
            details: {
              hasName: !!customerName,
              hasPhone: !!customerPhone,
              hasDatetime: !!localDatetime,
              hasDuration: !!apptDuration,
              hasServiceType: !!appointmentType
            }
          };
        }
        
        // Convert service name to UUID (AI sends name, DB expects UUID)
        console.log(`🔍 Looking up service by name: "${appointmentType}"`);
        let serviceId = appointmentType;
        
        // Check if appointmentType is already a UUID (contains dashes)
        if (!appointmentType.includes('-')) {
          // It's a name, need to look it up
          const services = await Database.getServices(accountId || undefined);
          const matchingService = services.find(s => 
            s.name.toLowerCase() === appointmentType.toLowerCase() ||
            s.name.toLowerCase().includes(appointmentType.toLowerCase()) ||
            appointmentType.toLowerCase().includes(s.name.toLowerCase())
          );
          
          if (matchingService) {
            serviceId = matchingService.id;
            console.log(`✅ Found service: "${matchingService.name}" → ${serviceId}`);
          } else {
            console.error(`❌ Service not found: "${appointmentType}"`);
            console.log(`📋 Available services:`, services.map(s => s.name));
            return {
              error: `Service "${appointmentType}" not found. Please use one of the available services.`,
              availableServices: services.map(s => s.name)
            };
          }
        } else {
          console.log(`✅ appointmentType is already a UUID: ${serviceId}`);
        }
        
        console.log(`📝 Creating appointment with data:`, {
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          datetime: localDatetime,
          duration: apptDuration,
          appointment_type: serviceId, // <- NOW USING UUID!
          notes: notes || null,
          status: 'booked',
          account_id: accountId
        });
        
        const newAppointment = await Database.createAppointment({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          datetime: localDatetime,
          duration: apptDuration,
          appointment_type: serviceId, // <- USE UUID INSTEAD OF NAME!
          notes,
          status: 'booked',
          account_id: accountId, // Use session's account_id for multi-tenant isolation
        });
        const appointmentResult = { 
          success: true, 
          message: `Appointment booked successfully for ${customerName} on ${localDatetime}`,
          appointment: {
            id: newAppointment.id,
            customerName: newAppointment.customerName,
            datetime: newAppointment.datetime,
            duration: newAppointment.duration,
            appointmentType: newAppointment.appointmentType
          }
        };
        
        console.log(`\n✅ BOOK APPOINTMENT RESULT:`);
        console.log(`   Success: true`);
        console.log(`   Appointment ID: ${newAppointment.id}`);
        console.log(`   Customer: ${newAppointment.customerName}`);
        console.log(`   DateTime: ${newAppointment.datetime}`);
        console.log(`${'='.repeat(80)}\n`);
        
        return appointmentResult;
      } catch (error: any) {
        const errorResult = { 
          error: 'Failed to create appointment. Please try again.',
          details: error.message,
          technicalError: error.toString()
        };
        
        console.error(`\n❌ BOOK APPOINTMENT ERROR:`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack:`, error.stack);
        console.error(`${'='.repeat(80)}\n`);
        
        return errorResult;
      }

    case 'findAppointments':
      const { customerPhone: searchPhone } = args;
      console.log(`🔍 Finding appointments for phone: ${searchPhone} in account: ${accountId}`);
      
      try {
        // Get appointments filtered by account
        const allAppointments = await Database.getAppointments({
          accountId: accountId || undefined
        });
        
        // Filter by phone number (handle different formats)
        const normalizedSearchPhone = searchPhone.replace(/[^0-9+]/g, '');
        const customerAppointments = allAppointments.filter(apt => {
          const aptPhone = (apt.customerPhone || '').replace(/[^0-9+]/g, '');
          return aptPhone === normalizedSearchPhone || 
                 aptPhone === `+${normalizedSearchPhone}` ||
                 `+${aptPhone}` === normalizedSearchPhone;
        });
        
        // Filter out cancelled appointments for cleaner results
        const activeAppointments = customerAppointments.filter(apt => 
          apt.status !== 'cancelled' && apt.status !== 'noshow'
        );
        
        console.log(`✅ Found ${activeAppointments.length} active appointments for ${searchPhone}`);
        
        // Return formatted appointment data
        const formattedAppointments = activeAppointments.map(apt => ({
          id: apt.id,
          customerName: apt.customerName,
          datetime: apt.datetime,
          duration: apt.duration,
          status: apt.status,
          appointmentType: apt.appointmentType,
          notes: apt.notes,
        }));
        
        return { 
          success: true, 
          appointments: formattedAppointments,
          count: formattedAppointments.length 
        };
      } catch (error) {
        console.error(`❌ Failed to find appointments:`, error);
        return { error: 'Failed to find appointments. Please try again.' };
      }

    case 'cancelAppointment':
      const { appointmentId, reason } = args;
      console.log(`🗑️ Cancelling appointment: ${appointmentId} for account: ${accountId}`, reason ? `Reason: ${reason}` : '');
      
      try {
        // First, get the appointment to verify it exists and belongs to this account
        const allAppointmentsForCancel = await Database.getAppointments({
          accountId: accountId || undefined
        });
        const appointmentToCancel = allAppointmentsForCancel.find(apt => apt.id === appointmentId);
        
        if (!appointmentToCancel) {
          console.log(`❌ Appointment ${appointmentId} not found`);
          return { error: 'Appointment not found.' };
        }
        
        if (appointmentToCancel.status === 'cancelled') {
          console.log(`⚠️ Appointment ${appointmentId} is already cancelled`);
          return { error: 'This appointment is already cancelled.' };
        }
        
        // Update appointment to cancelled status
        const updatedNotes = reason 
          ? `${appointmentToCancel.notes || ''}\n[Cancelled: ${reason}]`.trim()
          : appointmentToCancel.notes;
        
        await Database.updateAppointment(appointmentId, {
          status: 'cancelled',
          notes: updatedNotes,
        });
        
        console.log(`✅ Appointment ${appointmentId} cancelled successfully`);
        return { 
          success: true, 
          message: 'Appointment cancelled successfully.',
          appointment: {
            id: appointmentToCancel.id,
            customerName: appointmentToCancel.customerName,
            datetime: appointmentToCancel.datetime,
            status: 'cancelled',
          }
        };
      } catch (error) {
        console.error(`❌ Failed to cancel appointment:`, error);
        return { error: 'Failed to cancel appointment. Please try again.' };
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
    // Get session to determine which account this chat belongs to
    const session = await db('test_chat_sessions')
      .where('id', parseInt(sessionId, 10))
      .first();
    
    const accountId = session?.account_id || null;
    const whatsappNumber = session?.whatsapp_number || null;
    const sessionType = session?.session_type || 'test';
    
    console.log(`🔍 Chat session ${sessionId}:`, {
      accountId,
      whatsappNumber,
      sessionType
    });
    
    const botConfig = await Database.getBotConfig();
    if (!botConfig) {
      throw new Error('Bot configuration not found.');
    }

    const activeSystemPrompt = botConfig.generatedSystemPrompt || botConfig.systemPrompt || 'You are a helpful AI assistant.';
    const promptType = botConfig.generatedSystemPrompt ? 'generated' : 'legacy';
    
    // Content Filter Settings
    const contentFilterEnabled = process.env.OPENAI_CONTENT_FILTER !== 'false';
    
    // Load available services for the account
    let servicesInfo = '';
    try {
      const services = await Database.getServices(accountId || undefined);
      if (services && services.length > 0) {
        const activeServices = services.filter(s => s.isActive);
        servicesInfo = '\n\nAVAILABLE SERVICES:\n';
        activeServices.forEach(service => {
          servicesInfo += `- "${service.name}": ${service.description || 'No description'} (${service.durationMinutes} minutes, ${service.price} ${service.currency})\n`;
        });
        servicesInfo += '\nWhen booking an appointment, use the exact service name from the list above for the appointmentType parameter.\n';
      }
    } catch (error) {
      console.warn('⚠️ Could not load services:', error);
    }
    
    console.log('🤖 AI Service: Bot config loaded:', {
      promptType,
      systemPrompt: activeSystemPrompt.substring(0, 50) + '...',
      contentFilterEnabled,
      servicesAvailable: servicesInfo.length > 0
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

    // Add customer context for WhatsApp chats
    let customerContext = '';
    if (whatsappNumber && sessionType === 'whatsapp') {
      customerContext = `
CUSTOMER INFORMATION (WhatsApp Chat)
- Customer Phone Number: ${whatsappNumber}
- Communication Channel: WhatsApp
- WICHTIG: Du kennst bereits die Telefonnummer dieses Kunden! Nutze ${whatsappNumber} automatisch für findAppointments und andere Tools.
- Der Kunde muss seine Nummer NICHT erneut angeben - du hast sie bereits!

`;
    }

    let extendedSystemPrompt = activeSystemPrompt + `
    
CURRENT DATE & TIME
- Heute ist: ${currentDateTime}
- Aktuelles Datum: ${currentDate}
- WICHTIG: Nutze dieses Datum für alle Terminberechnungen und -prüfungen!

${servicesInfo}

${customerContext}SESSION MEMORY
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

IMPORTANT BOOKING RULES:
- When checkAvailability returns time blocks like "13:00 bis 17:00", this means ANY time between 13:00 and 17:00 is available
- If a customer wants 15:00 and you get "13:00 bis 17:00", you CAN book at 15:00 - it's within the range!
- Only reject a booking if the requested time is OUTSIDE the available blocks
- Example: Block "13:00-17:00" covers: 13:00, 13:15, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, etc.
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
      // Execute tools and continue conversation (pass accountId for multi-tenancy)
      const toolResults = await Promise.all(toolCalls.map(tc => executeTool(tc, accountId)));
      
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