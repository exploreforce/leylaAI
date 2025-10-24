import OpenAI from 'openai';
import { ChatMessage, ResponsesApiOutputItem, OutputContent, UrlCitation, WebSearchSource } from '../types';
import { Database, db } from '../models/database';
import { getBusinessDaySlots, isTimeSlotAvailable } from '../utils';
import { getViennaDate, getViennaTime, getViennaWeekday, getViennaDateTime, calculateRelativeDate, getAccountDate, getAccountTime, getAccountWeekday, getAccountDateTime, calculateAccountRelativeDate, getWeekdayForDate } from '../utils/timezone';
import { formatForDatabase } from '../utils/timezoneUtils';

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

const tools: any[] = [
  {
    type: 'function',
    function: {
      name: 'checkAvailability',
      description: 'Checks availability for appointments. Returns free TIME BLOCKS (start-end ranges). CRITICAL: Any requested time that falls WITHIN a block IS AVAILABLE. Example: Block "13:00-17:00" means 13:00, 13:15, 13:30, 14:00, 14:15, 14:30, 15:00, 15:30, 16:00, 16:15, 16:30, 16:45 are ALL AVAILABLE. Always check if customer requested time falls within returned blocks.',
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
      description: 'Finds all existing appointments for a specific customer by their phone number. Use this tool BEFORE cancelling to get the correct appointment UUID. Returns appointments with timezone-converted times: use localDateTime/localDate/localTime fields for displaying to users (in account timezone), datetime field is UTC for internal reference only.',
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
      description: 'Cancels an existing appointment by its UUID. CRITICAL: You MUST call findAppointments first to get the appointment UUID. Never guess the appointmentId - always use the UUID returned by findAppointments. The appointmentId must be a UUID format (e.g., "ba903e6d-0558-447f-a4b9-41037c32d9d3"), not a date/time string.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: {
            type: 'string',
            description: 'The UUID of the appointment to cancel (obtained from findAppointments).',
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

// Web Search Tool (always enabled)
const webSearchTool = {
  type: 'web_search' as const,
  user_location: {
    type: 'approximate' as const
  },
  search_context_size: 'low' as const
};

// Combine web search with custom function tools
const allTools = [webSearchTool, ...tools];

// --- Tool Implementation ---

const executeTool = async (
  toolCall: any, // Compatible with both Chat Completions and Responses API format
  accountId: string | null = null,
  sessionId: string | null = null,
  whatsappNumber: string | null = null,
  isFlagged: boolean = false
) => {
  const toolName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 TOOL CALL START: ${toolName}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📋 Tool ID: ${toolCall.id}`);
  console.log(`👤 Account ID: ${accountId || 'N/A'}`);
  console.log(`📥 Parameters:`, JSON.stringify(args, null, 2));

  // Fetch account timezone once for all tool calls that need it
  const accountTimezone = await Database.getAccountTimezone(accountId || undefined);

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
      
      const availabilityConfig = await Database.getAvailabilityConfig(accountId || '');
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
          await Database.updateAvailabilityConfig(accountId || '', defaultWeeklySchedule);
          console.log('✅ Default availability config created');
        } catch (error) {
          console.error('❌ Failed to create default config:', error);
        }
        
        // Use default business hours if no config (09:00 - 17:00)
        const businessHours = [{ start: '09:00', end: '17:00' }];
        const booked = await Database.getAppointments({ 
          startDateStr: date, 
          endDateStr: date,
          accountId: accountId || undefined,
          includeInactive: false // Only include active appointments (pending, booked, confirmed)
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
          // Convert UTC datetime to account timezone
          const utcDate = new Date(appt.datetime);
          const accountDate = new Date(utcDate.toLocaleString('en-US', { timeZone: accountTimezone }));
          const appointmentStart = `${String(accountDate.getHours()).padStart(2, '0')}:${String(accountDate.getMinutes()).padStart(2, '0')}`;
          const appointmentEnd = addMinutesToHHmm(appointmentStart, appt.duration || 0);
          
          // Add 30-minute buffer before and after appointment
          const bufferedStart = addMinutesToHHmm(appointmentStart, -30);
          const bufferedEnd = addMinutesToHHmm(appointmentEnd, 30);
          
          console.log(`   📌 Appointment: ${appt.customerName} at ${appointmentStart}-${appointmentEnd} (UTC: ${appt.datetime}) → Blocked: ${bufferedStart}-${bufferedEnd}`);
          
          return { start: bufferedStart, end: bufferedEnd };
        });
        
        console.log(`📅 Found ${bookedSlots.length} booked appointments on ${date} (default hours)`);
        if (bookedSlots.length > 0) {
          console.log(`   Blocked time slots (with 30min buffer):`, bookedSlots);
        }
        
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
        
        // Build explicit time validation
        let explicitTimeCheck = '';
        if (freeBlocks.length > 0) {
          const commonTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
          const availableTimes = commonTimes.filter(time => {
            return freeBlocks.some(block => time >= block.start && time < block.end);
          });
          if (availableTimes.length > 0) {
            explicitTimeCheck = ` EXPLICIT AVAILABILITY: ${availableTimes.join(', ')} are ALL AVAILABLE.`;
          }
        }
        
        return { 
          availableSlots: freeBlocks,
          message: freeBlocks.length > 0 
            ? `AVAILABLE on ${date}: ${freeBlocks.map(b => `${b.start}-${b.end}`).join(', ')}. ANY time within these blocks can be booked (appointments start every 15 minutes).${explicitTimeCheck} IMPORTANT: If customer requested a specific time, check if it falls WITHIN these ranges. If yes, that time IS AVAILABLE.`
            : 'Not available on this date.'
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
          message: 'Not available on this date - closed.'
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

      // Get booked appointments for the day (filtered by account, only active appointments)
      const booked = await Database.getAppointments({ 
        startDateStr: date, 
        endDateStr: date,
        accountId: accountId || undefined,
        includeInactive: false // Only include active appointments (pending, booked, confirmed)
      });
      const bookedSlots = booked.map(appt => {
        // Convert UTC datetime to account timezone
        const utcDate = new Date(appt.datetime);
        const accountDate = new Date(utcDate.toLocaleString('en-US', { timeZone: accountTimezone }));
        const appointmentStart = `${String(accountDate.getHours()).padStart(2, '0')}:${String(accountDate.getMinutes()).padStart(2, '0')}`;
        const appointmentEnd = addMinutesToHHmm(appointmentStart, appt.duration || 0);
        
        // Add 30-minute buffer before and after appointment
        const bufferedStart = addMinutesToHHmm(appointmentStart, -30);
        const bufferedEnd = addMinutesToHHmm(appointmentEnd, 30);
        
        console.log(`   📌 Appointment: ${appt.customerName} at ${appointmentStart}-${appointmentEnd} (UTC: ${appt.datetime}) → Blocked: ${bufferedStart}-${bufferedEnd}`);
        
        return { start: bufferedStart, end: bufferedEnd };
      });
      
      console.log(`📅 Found ${bookedSlots.length} booked appointments on ${date}`);
      if (bookedSlots.length > 0) {
        console.log(`   Blocked time slots (with 30min buffer):`, bookedSlots);
      }
      
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
      
      // Build explicit time validation
      let explicitTimeCheck = '';
      if (freeBlocks.length > 0) {
        const commonTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
        const availableTimes = commonTimes.filter(time => {
          return freeBlocks.some(block => time >= block.start && time < block.end);
        });
        if (availableTimes.length > 0) {
          explicitTimeCheck = ` EXPLICIT AVAILABILITY: ${availableTimes.join(', ')} are ALL AVAILABLE.`;
        }
      }
      
      const result = { 
        availableSlots: freeBlocks,
        message: freeBlocks.length > 0 
          ? `AVAILABLE on ${date}: ${freeBlocks.map(b => `${b.start}-${b.end}`).join(', ')}. ANY time within these blocks can be booked (appointments start every 15 minutes).${explicitTimeCheck} IMPORTANT: If customer requested a specific time, check if it falls WITHIN these ranges. If yes, that time IS AVAILABLE.`
          : 'Not available on this date.'
      };
      
      console.log(`\n✅ CHECK AVAILABILITY RESULT:`);
      console.log(`   Free Blocks: ${freeBlocks.length}`);
      console.log(`   Blocks:`, JSON.stringify(freeBlocks, null, 2));
      console.log(`   Message: ${result.message.substring(0, 100)}...`);
      console.log(`${'='.repeat(80)}\n`);
      
      return result;

    case 'bookAppointment':
      let { customerName, customerPhone, customerEmail, datetime, duration: apptDuration, appointmentType, notes } = args;
      
      // ✅ FIX: Auto-use WhatsApp number if available and phone is missing
      if ((!customerPhone || customerPhone === '') && whatsappNumber) {
        customerPhone = whatsappNumber;
        console.log(`✅ Auto-filled customerPhone from WhatsApp session: ${customerPhone}`);
      }
      
      console.log(`\n📝 BOOK APPOINTMENT`);
      console.log(`   Customer: ${customerName}`);
      console.log(`   Phone: ${customerPhone}`);
      console.log(`   Email: ${customerEmail || 'N/A'}`);
      console.log(`   DateTime: ${datetime} (type: ${typeof datetime})`);
      console.log(`   Duration: ${apptDuration} minutes`);
      console.log(`   Service: ${appointmentType}`);
      console.log(`   Notes: ${notes || 'N/A'}`);
      
      // Convert datetime to UTC for storage
      const utcDate = formatForDatabase(datetime, accountTimezone);
      console.log(`📅 Timezone conversion: "${datetime}" (${accountTimezone}) → "${utcDate.toISOString()}" (UTC)`);
      
      try {
        // Use the account ID from the current session
        if (!accountId) {
          console.warn('⚠️ No account found in session - creating appointment without account_id');
        } else {
          console.log(`✅ Using session account ID: ${accountId}`);
        }
        
        // Validate the appointment data
        if (!customerName || !customerPhone || !datetime || !apptDuration || !appointmentType) {
          console.error('❌ Missing required appointment fields:', { customerName, customerPhone, datetime, apptDuration, appointmentType });
          return { 
            error: 'Missing required appointment information. Please provide: customer name, phone number, date/time, duration, and service type.',
            details: {
              hasName: !!customerName,
              hasPhone: !!customerPhone,
              hasDatetime: !!datetime,
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
          // Load services for the current account
          const services = await Database.getServices(accountId || '');
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
        
      // Load bot config to determine review mode
      const botConfig = await Database.getBotConfig(accountId || '');
      const reviewMode = botConfig?.reviewMode || 'never';
      
      // Determine appointment status based on review mode and flag status
      let appointmentStatus: 'pending' | 'confirmed' = 'confirmed';
      
      if (reviewMode === 'always') {
        appointmentStatus = 'pending';
        console.log('🔍 Review mode: ALWAYS - Setting appointment status to pending');
      } else if (reviewMode === 'on_redflag' && isFlagged) {
        appointmentStatus = 'pending';
        console.log('🚩 RedFlag detected & review mode: ON_REDFLAG - Setting appointment status to pending');
      } else {
        console.log(`✅ Review mode: ${reviewMode}, isFlagged: ${isFlagged} - Setting appointment status to confirmed`);
      }
      
      console.log(`📝 Creating appointment with data:`, {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        datetime: utcDate,
        duration: apptDuration,
        appointment_type: serviceId, // <- NOW USING UUID!
        notes: notes || null,
        status: appointmentStatus,
        account_id: accountId
      });
      
      const newAppointment = await Database.createAppointment({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        datetime: utcDate,
        duration: apptDuration,
        appointment_type: serviceId, // <- USE UUID INSTEAD OF NAME!
        notes: notes || null,
        status: appointmentStatus, // Dynamic status based on review mode
        account_id: accountId, // Use session's account_id for multi-tenant isolation
      });
        const appointmentResult = { 
          success: true, 
          message: `Appointment booked successfully for ${customerName} on ${datetime}`,
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
      let { customerPhone: searchPhone } = args;
      
      // ✅ FIX: Auto-use WhatsApp number if available and phone is missing
      if ((!searchPhone || searchPhone === '') && whatsappNumber) {
        searchPhone = whatsappNumber;
        console.log(`✅ Auto-filled searchPhone from WhatsApp session: ${searchPhone}`);
      }
      
      console.log(`🔍 Finding appointments for phone: ${searchPhone} in account: ${accountId}`);
      
      try {
        // Get only active appointments (includeInactive: false filters out cancelled, completed, noshow)
        const allAppointments = await Database.getAppointments({
          accountId: accountId || undefined,
          includeInactive: false
        });
        
        // Filter by phone number (handle different formats)
        const normalizedSearchPhone = searchPhone.replace(/[^0-9+]/g, '');
        const activeAppointments = allAppointments.filter(apt => {
          const aptPhone = (apt.customerPhone || '').replace(/[^0-9+]/g, '');
          return aptPhone === normalizedSearchPhone || 
                 aptPhone === `+${normalizedSearchPhone}` ||
                 `+${aptPhone}` === normalizedSearchPhone;
        });
        
        console.log(`✅ Found ${activeAppointments.length} active appointments for ${searchPhone}`);
        
        // Return formatted appointment data with timezone conversion
        const formattedAppointments = activeAppointments.map(apt => {
          // Convert UTC datetime to account timezone for display
          const utcDate = new Date(apt.datetime);
          const localDateTimeStr = utcDate.toLocaleString('de-AT', { 
            timeZone: accountTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          
          // Also provide ISO format in local timezone for easier parsing
          const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: accountTimezone }));
          const localISODate = localDate.toISOString().split('T')[0]; // YYYY-MM-DD
          const localTime = `${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`; // HH:mm
          
          console.log(`   📅 Appointment ${apt.id}: ${apt.datetime} (UTC) → ${localDateTimeStr} (${accountTimezone})`);
          
          return {
            id: apt.id,
            customerName: apt.customerName,
            datetime: apt.datetime, // UTC for internal reference
            localDateTime: localDateTimeStr, // "27.10.2025, 10:00" - for user display
            localDate: localISODate, // "2025-10-27" - for easier matching
            localTime: localTime, // "10:00" - for easier matching
            duration: apt.duration,
            status: apt.status,
            appointmentType: apt.appointmentType,
            notes: apt.notes,
          };
        });
        
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
        // Get all appointments (including inactive) to find the one to cancel
        const allAppointmentsForCancel = await Database.getAppointments({
          accountId: accountId || undefined,
          includeInactive: true // Need to find even cancelled appointments to prevent double-cancellation
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

// --- Helper Functions for Responses API ---

/**
 * Converts Chat Completions message format to Responses API input items format
 */
const convertMessagesToInputItems = (messages: any[]): any[] => {
  return messages
    .filter(msg => msg.role !== 'system') // System messages go to instructions
    .map(msg => {
      // Handle tool results
      if (msg.role === 'tool') {
        return {
          type: 'function_call_output',
          call_id: msg.tool_call_id,
          output: msg.content
        };
      }
      
      // Handle assistant messages with tool calls
      if (msg.role === 'assistant' && msg.tool_calls) {
        // Tool calls are handled separately in output
        return null;
      }
      
      // Handle regular messages
      return {
        type: 'message',
        role: msg.role,
        content: [
          {
            type: 'input_text',
            text: msg.content || ''
          }
        ]
      };
    })
    .filter(item => item !== null);
};

/**
 * Extracts function calls from Responses API output
 */
const extractFunctionCalls = (output: ResponsesApiOutputItem[]): any[] => {
  return output
    .filter(item => item.type === 'function_call')
    .map(item => ({
      id: item.id,
      type: 'function',
      function: {
        name: item.name,
        arguments: JSON.stringify(item.arguments || {})
      }
    }));
};

// --- Main AI Service Logic ---

export class AIService {
  static async getChatResponse(
    messages: ChatMessage[],
    sessionId: string,
    preferredLanguage?: string
  ): Promise<ChatMessage> {
    // Maximum iterations for tool call loop to prevent infinite loops
    const MAX_TOOL_ITERATIONS = 5;
    
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
    
    const botConfig = await Database.getBotConfig(accountId || '');
    if (!botConfig) {
      throw new Error('Bot configuration not found.');
    }

    // Load language settings from database (account-specific)
    const languageSettings = await db('language_settings')
      .where('account_id', accountId)
      .where('is_default', true)
      .first();
    
    const configuredLanguage = languageSettings?.language_code || 'de';
    const configuredLanguageName = languageSettings?.language_name || 'Deutsch (German)';
    
    console.log(`🌍 Configured language: ${configuredLanguageName} (${configuredLanguage})`);
    if (preferredLanguage) {
      console.log(`🎨 User's UI language: ${preferredLanguage}`);
    }

    const activeSystemPrompt = botConfig.generatedSystemPrompt || botConfig.systemPrompt || 'You are a helpful AI assistant.';
    const promptType = botConfig.generatedSystemPrompt ? 'generated' : 'legacy';
    
    // Content Filter Settings
    const contentFilterEnabled = process.env.OPENAI_CONTENT_FILTER !== 'false';
    
    // Load available services (simplified - don't overload the prompt)
    let servicesInfo = '';
    // Note: Services are loaded internally for bookAppointment tool
    // No need to list them in system prompt - keeps prompt clean
    
    console.log('🤖 AI Service: Bot config loaded:', {
      promptType,
      systemPrompt: activeSystemPrompt.substring(0, 50) + '...',
      contentFilterEnabled,
      servicesAvailable: servicesInfo.length > 0,
      configuredLanguage
    });

    // Erweitere System Prompt basierend auf Einstellungen
    // Use account-specific timezone for all date/time calculations
    const accountTimezone = await Database.getAccountTimezone(accountId);
    const currentDate = await getAccountDate(accountId); // YYYY-MM-DD
    const currentTime = await getAccountTime(accountId); // HH:MM
    const currentWeekday = await getAccountWeekday(accountId); // "Montag", "Dienstag", etc.
    const currentDateTime = await getAccountDateTime(accountId); // Full formatted
    
    // Calculate common relative dates for reference in system prompt
    const tomorrow = await calculateAccountRelativeDate(1, accountId);
    const dayAfterTomorrow = await calculateAccountRelativeDate(2, accountId);
    const nextWeek = await calculateAccountRelativeDate(7, accountId);
    
    // Calculate next 14 days with weekdays for accurate weekday-based booking
    const next14DaysCalendar: string[] = [];
    for (let i = 0; i < 14; i++) {
      const futureDate = await calculateAccountRelativeDate(i, accountId);
      const futureWeekday = await getWeekdayForDate(futureDate, accountId);
      next14DaysCalendar.push(`- ${futureDate} (${futureWeekday})`);
    }
    const weekdayCalendar = next14DaysCalendar.join('\n');
    
    console.log(`📅 Account Timezone Context (${accountTimezone}):`, {
      date: currentDate,
      time: currentTime,
      weekday: currentWeekday,
      tomorrow,
      dayAfterTomorrow
    });
    console.log(`📅 Generated 14-day weekday calendar for accurate date lookups`);
    
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

IMPORTANT FOR APPOINTMENT BOOKING:
- You already know this customer's phone number: ${whatsappNumber}
- When calling bookAppointment, ALWAYS use ${whatsappNumber} as customerPhone
- You do NOT need to ask the customer for their phone number - you already have it!
- Example: If customer says "My name is Max", you have everything needed for booking: Name=Max, Phone=${whatsappNumber}

`;
    }

    let extendedSystemPrompt = activeSystemPrompt + `
    
CURRENT DATE & TIME (Timezone: ${accountTimezone})
==================================================
- Date: ${currentDate} (YYYY-MM-DD Format)
- Time: ${currentTime}
- Weekday: ${currentWeekday}
- Full DateTime: ${currentDateTime}

NEXT 14 DAYS WITH WEEKDAYS (USE THIS FOR ALL WEEKDAY-BASED BOOKINGS):
==================================================
${weekdayCalendar}

CRITICAL RULES FOR WEEKDAY-BASED APPOINTMENTS:
1. When user says "Friday", "Monday", etc. → Look up the date from the list above
2. When user says "next Friday" → Find the next occurrence of Friday in the list
3. When user says "this Friday" → Find the first Friday in the list
4. NEVER guess or calculate weekdays yourself - ALWAYS use the list above
5. After finding the date, ALWAYS confirm with customer: "That would be [DATE] ([WEEKDAY])"

EXAMPLE:
User: "I'd like an appointment on Friday at 2pm"
You: "Sure! This Friday is [DATE FROM CALENDAR]. Let me check availability..."

RELATIVE DATE CALCULATIONS
============================
For appointment requests:
1. Weekday names (Friday, Monday, etc.) → Use the 14-day calendar above
2. "today" / "heute" → ${currentDate}
3. "tomorrow" / "morgen" → ${tomorrow}
4. "day after tomorrow" / "übermorgen" → ${dayAfterTomorrow}
5. "in X days" → Use the 14-day calendar above

ALWAYS confirm the calculated date with the customer before booking!

APPOINTMENT CANCELLATION WORKFLOW - CRITICAL INSTRUCTIONS:
==================================================
When a customer wants to cancel an appointment, you MUST follow this exact workflow:

STEP 1: FIND THE APPOINTMENT
STEP 2: IDENTIFY THE CORRECT APPOINTMENT
STEP 3: CANCEL THE APPOINTMENT

${servicesInfo}

${customerContext}SESSION MEMORY
- Known user info: ${previousUserInformation || 'None'}
- Last user language: ${previousUserLanguage || 'unknown'}
- Last safety flag: ${previousIsFlagged ? 'true' : 'false'}

Answer in the language the user is writing in.
**EXAMPLES:**
- User writes: "Hello, I need an appointment"
  → user_language = 'en'
  → chat_response = "Hello! I'd be happy to help you book an appointment..." (in English!)

- User writes: "Hola, necesito una cita"
  → user_language = 'es'
  → chat_response = "¡Hola! Con gusto te ayudo a reservar una cita..." (in Spanish!)

- User writes: "Guten Tag, ich brauche einen Termin"
  → user_language = 'de'
  → chat_response = "Guten Tag! Gerne helfe ich Ihnen bei der Terminbuchung..." (in German!)

WEB SEARCH CAPABILITY (ALWAYS AVAILABLE):
==================================================
You have access to real-time web search to find current information from the internet.

WHEN TO USE WEB SEARCH:
- User asks about current events, news, or recent developments
- User asks about prices, availability, or market information that changes frequently
- User asks "what's new" or "latest" about a topic
- User asks about weather, traffic, or real-time conditions
- User needs fact-checking or verification of recent information

HOW TO USE WEB SEARCH:
- The web search tool is automatically available - just use it when needed
- Search results will include citations with URLs
- Always mention when information comes from web search: "According to recent sources..." or "Based on current information..."
- If search returns no results, inform the user

IMPORTANT:
- Web search supplements your knowledge, use it when your training data may be outdated
- Always cite sources when using web search results
- Don't make up information - if web search doesn't find it, say so

GUIDELINES
- Always return JSON matching the provided schema (no prose outside JSON)
- chat_response is what the user sees (MUST match the user_language you detected)
- user_information is a concise rolling summary to carry across turns
- user_language is the DETECTED language code of the USER'S message (e.g., 'de', 'en', 'es', 'ru', 'pl')
- is_flagged true only if content crosses a red line
- user_sentiment is a short qualitative label

IMPORTANT: Always check tools before answering questions about availability or appointments.

AVAILABILITY INTERPRETATION RULES:
- When checkAvailability returns time blocks (e.g., "09:00-12:00, 13:00-17:00"), ANY time within those blocks is available
- If customer requests 10:30 and blocks are "09:00-12:00", then 10:30 IS AVAILABLE (it falls within the block)
- If customer requests 14:00 and blocks are "13:00-17:00", then 14:00 IS AVAILABLE (it falls within the block)
- Only times OUTSIDE all blocks are unavailable
- Appointments can start every 15 minutes within blocks (e.g., 09:00, 09:15, 09:30, etc.)

CRITICAL AVAILABILITY INTERPRETATION - READ CAREFULLY:
========================================
WARNING: NEVER say a time is unavailable if it falls within a returned time block!

EXPLICIT STEP-BY-STEP LOGIC:
1. checkAvailability returns time blocks (e.g., "13:00-17:00")
2. Customer requests specific time (e.g., "14:00")
3. Check: Is 14:00 >= 13:00 AND 14:00 < 17:00? → YES
4. Conclusion: 14:00 IS AVAILABLE

REAL EXAMPLES FROM THIS SYSTEM:
Example 1:
- Tool returns: "09:00-12:00, 13:00-17:00"
- Customer asks: "Do you have time at 14:00?"
- CORRECT answer: "Yes, 14:00 is available! That falls within my 13:00-17:00 time block."

Example 2:
- Tool returns: "13:00-17:00"
- Customer asks: "I would like an appointment at 2 PM tomorrow"
- CORRECT: "Perfect! 2 PM (14:00) is available. Let me book that for you."

Example 3:
- Tool returns: "09:00-12:00"
- Customer asks: "Is 10:30 available?"
- CORRECT: "Yes! 10:30 is available within my 09:00-12:00 time block."

ONLY say a time is unavailable if it falls OUTSIDE all returned blocks.

MULTI-STEP WORKFLOWS:
========================================
You can use tools sequentially to accomplish complex tasks:
1. findAppointments → get appointment ID
2. checkAvailability → verify new slot is free
3. bookAppointment → create new appointment
4. cancelAppointment → remove old appointment

Example: "Move my Wednesday appointment to Thursday"
- Step 1: findAppointments(customerPhone) to get Wednesday appointment
- Step 2: checkAvailability("2025-10-31", duration) to check Thursday
- Step 3: bookAppointment(...) to book Thursday slot
- Step 4: cancelAppointment(oldAppointmentId) to cancel Wednesday

You will automatically get results from each tool call before proceeding to the next.
`;

    // System prompt wird als instructions verwendet (nicht mehr in messages)
    const instructions = extendedSystemPrompt;
    
    // Initialize conversation history and iteration variables
    let conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content || '',
    })).filter(msg => msg.content.trim().length > 0) as OpenAI.Chat.ChatCompletionMessageParam[];

    let iterationCount = 0;
    let allToolCallsMetadata: any[] = [];
    let allWebSearchSources: WebSearchSource[] = [];
    let allCitations: UrlCitation[] = [];

    console.log('🤖 AI Service: Sending to OpenAI Responses API:', {
      model: 'gpt-5',
      instructions: instructions.substring(0, 50) + '...',
      messageCount: conversationHistory.length,
      conversationHistory: conversationHistory.map(m => `${m.role}: ${typeof m.content === 'string' ? m.content.substring(0, 50) : 'complex'}...`),
      currentDate: currentDate,
      currentDateTime: currentDateTime,
      structuredOutput: true,
      verbosity: 'low',
      reasoningEffort: 'medium'
    });

    // Multi-Step Tool Call Loop
    while (iterationCount < MAX_TOOL_ITERATIONS) {
      iterationCount++;
      console.log(`\n🔄 Tool Call Iteration ${iterationCount}/${MAX_TOOL_ITERATIONS}`);

      // Convert messages to Responses API format
      const inputItems = convertMessagesToInputItems(conversationHistory);

      const apiParams: any = {
        model: 'gpt-5', // Hardcoded
        instructions: instructions,
        input: inputItems,
        text: {
          format: {
            type: "json_schema",
            name: "botResponseSchema",
            strict: true,
            schema: botResponseSchema
          },
          verbosity: 'low' // Hardcoded
        },
        reasoning: {
          effort: 'medium', // Hardcoded
          summary: true
        },
        tools: allTools,
        tool_choice: 'auto',
        temperature: 0.7,
        parallel_tool_calls: true,
        store: false,
        include: [
          'reasoning.encrypted_content',
          'web_search_call.action.sources'
        ]
      };

      const response = await openai.responses.create(apiParams);
      const output = response.output as ResponsesApiOutputItem[];

      // Extract different output types
      const messageItems = output.filter(item => item.type === 'message');
      const webSearchItems = output.filter(item => item.type === 'web_search_call');
      const functionCallItems = extractFunctionCalls(output);

      // Collect web search sources and citations
      webSearchItems.forEach(item => {
        if (item.action?.sources) {
          allWebSearchSources.push(...item.action.sources);
        }
      });

      // No more function calls - generate final response
      if (functionCallItems.length === 0) {
        console.log('✅ No more function calls - generating final response');
        
        const assistantMessage = messageItems.find(item => item.role === 'assistant');
        
        if (!assistantMessage || !assistantMessage.content) {
          throw new Error('No assistant message in response output');
        }

        const textContent = assistantMessage.content.find(c => c.type === 'output_text');
        
        if (!textContent) {
          throw new Error('No text content in assistant message');
        }

        const annotations = textContent.annotations || [];
        allCitations.push(...annotations);

        let structuredResponse: BotResponse;
        try {
          structuredResponse = JSON.parse(textContent.text || '{}') as BotResponse;
          console.log('🎯 Final structured response:', {
            user_language: structuredResponse.user_language,
            is_flagged: structuredResponse.is_flagged,
            toolCallsExecuted: allToolCallsMetadata.length,
            iterations: iterationCount,
            webSearchSources: allWebSearchSources.length,
            citations: allCitations.length
          });
        } catch (error) {
          console.error('❌ Failed to parse structured response:', error);
          structuredResponse = {
            chat_response: textContent.text || 'Sorry, I encountered an error.',
            user_language: preferredLanguage || 'en',
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
            userInformation: structuredResponse.user_information,
            toolCalls: allToolCallsMetadata,
            iterations: iterationCount,
            webSearchSources: allWebSearchSources,
            citations: allCitations
          }
        };
      }

      // Execute function calls
      console.log(`🔧 Executing ${functionCallItems.length} function call(s) in iteration ${iterationCount}:`);
      functionCallItems.forEach(tc => console.log(`   - ${tc.function.name}`));

      let isFlagged = false;
      try {
        const assistantMsg = messageItems.find(item => item.role === 'assistant');
        if (assistantMsg?.content) {
          const textContent = assistantMsg.content.find(c => c.type === 'output_text');
          if (textContent) {
            const earlyResponse = JSON.parse(textContent.text || '{}') as BotResponse;
            isFlagged = earlyResponse.is_flagged || false;
          }
        }
      } catch (error) {
        console.log('⚠️ Could not parse early structured response for flag status');
      }

      const toolResults = await Promise.all(
        functionCallItems.map(tc => executeTool(tc, accountId, sessionId, whatsappNumber, isFlagged))
      );

      // Save tool calls metadata
      functionCallItems.forEach((tc, i) => {
        allToolCallsMetadata.push({
          iteration: iterationCount,
          name: tc.function.name,
          parameters: JSON.parse(tc.function.arguments),
          result: toolResults[i],
          status: 'completed'
        });
      });

      // Add function calls to conversation history
      functionCallItems.forEach((toolCall, i) => {
        // Add function result as tool message
        conversationHistory.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolCall.function.name,
          content: JSON.stringify(toolResults[i])
        } as any);
      });

      // Loop continues - AI will decide if more tools are needed
    }

    // Maximum iterations reached - force final response
    console.warn(`⚠️ Maximum tool iterations (${MAX_TOOL_ITERATIONS}) reached!`);

    // Convert messages to Responses API format
    const finalInputItems = convertMessagesToInputItems(conversationHistory);

    const finalApiParams: any = {
      model: 'gpt-5', // Hardcoded
      instructions: instructions + '\n\nIMPORTANT: Maximum tool calls reached. Generate final response WITHOUT using more tools. Summarize what was accomplished.',
      input: finalInputItems,
      text: {
        format: {
          type: "json_schema",
          name: "botResponseSchema",
          strict: true,
          schema: botResponseSchema
        },
        verbosity: 'low' // Hardcoded
      },
      reasoning: {
        effort: 'medium', // Hardcoded
        summary: true
      },
      tools: [], // No tools for final response
      temperature: 0.7,
      parallel_tool_calls: true,
      store: false
    };

    const finalResponse = await openai.responses.create(finalApiParams);
    const finalOutput = finalResponse.output as ResponsesApiOutputItem[];
    
    const finalMessageItems = finalOutput.filter(item => item.type === 'message');
    const finalAssistantMessage = finalMessageItems.find(item => item.role === 'assistant');

    let structuredResponse: BotResponse;
    try {
      if (!finalAssistantMessage || !finalAssistantMessage.content) {
        throw new Error('No assistant message in final response');
      }
      
      const finalTextContent = finalAssistantMessage.content.find(c => c.type === 'output_text');
      if (!finalTextContent) {
        throw new Error('No text content in final assistant message');
      }

      structuredResponse = JSON.parse(finalTextContent.text || '{}') as BotResponse;
    } catch (error) {
      console.error('❌ Failed to parse final structured response:', error);
      structuredResponse = {
        chat_response: 'I apologize, but I encountered an issue processing your request.',
        user_language: preferredLanguage || 'en',
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
        userInformation: structuredResponse.user_information,
        toolCalls: allToolCallsMetadata,
        iterations: iterationCount,
        maxIterationsReached: true,
        webSearchSources: allWebSearchSources,
        citations: allCitations
      }
    };
  }
} 