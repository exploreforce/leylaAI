import { v4 as uuidv4 } from 'uuid';

// Generate UUID
export const generateId = (): string => {
  return uuidv4();
};

// Date utilities
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateTime = (date: Date): string => {
  return date.toISOString();
};

export const parseTimeSlot = (timeString: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
};

export const isTimeSlotAvailable = (
  requestedStart: string,
  requestedEnd: string,
  existingSlots: Array<{ start: string; end: string }>
): boolean => {
  const requested = {
    start: parseTimeSlot(requestedStart),
    end: parseTimeSlot(requestedEnd)
  };

  return !existingSlots.some(slot => {
    const existing = {
      start: parseTimeSlot(slot.start),
      end: parseTimeSlot(slot.end)
    };

    // Check for overlap
    const requestedStartMinutes = requested.start.hours * 60 + requested.start.minutes;
    const requestedEndMinutes = requested.end.hours * 60 + requested.end.minutes;
    const existingStartMinutes = existing.start.hours * 60 + existing.start.minutes;
    const existingEndMinutes = existing.end.hours * 60 + existing.end.minutes;

    return (
      (requestedStartMinutes < existingEndMinutes) &&
      (requestedEndMinutes > existingStartMinutes)
    );
  });
};

// Validation utilities
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// String utilities
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with + if it doesn't already
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return cleaned;
};

// Error utilities
export const createErrorResponse = (message: string, statusCode: number = 400) => {
  return {
    success: false,
    error: {
      message,
      statusCode
    }
  };
};

export const createSuccessResponse = <T>(data: T, meta?: any) => {
  return {
    success: true,
    data,
    ...(meta && { meta })
  };
};

// Time zone utilities
export const convertToTimezone = (date: Date, timezone: string): Date => {
  // This is a simplified version - in production, use a library like date-fns-tz
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
};

export const getBusinessDaySlots = (
  startTime: string,
  endTime: string,
  slotDuration: number,
  bufferTime: number = 0,
  incrementMinutes: number = 15
): Array<{ start: string; end: string }> => {
  const slots: Array<{ start: string; end: string }> = [];
  const start = parseTimeSlot(startTime);
  const end = parseTimeSlot(endTime);
  
  let currentMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  while (currentMinutes + slotDuration <= endMinutes) {
    const slotStart = {
      hours: Math.floor(currentMinutes / 60),
      minutes: currentMinutes % 60
    };
    
    const slotEndMinutes = currentMinutes + slotDuration;
    const slotEnd = {
      hours: Math.floor(slotEndMinutes / 60),
      minutes: slotEndMinutes % 60
    };
    
    slots.push({
      start: `${slotStart.hours.toString().padStart(2, '0')}:${slotStart.minutes.toString().padStart(2, '0')}`,
      end: `${slotEnd.hours.toString().padStart(2, '0')}:${slotEnd.minutes.toString().padStart(2, '0')}`
    });
    
    currentMinutes += incrementMinutes;
  }
  
  return slots;
}; 