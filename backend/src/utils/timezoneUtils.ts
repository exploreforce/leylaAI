/**
 * Timezone utility functions for UTC conversion and account-specific timezone handling
 */

import { db } from '../models/database';

/**
 * Convert a datetime string from a specific timezone to UTC
 * @param datetimeStr - DateTime string in format "YYYY-MM-DD HH:mm" or ISO format
 * @param fromTimezone - IANA timezone string (e.g., "Europe/Vienna")
 * @returns Date object in UTC
 */
export function convertToUTC(datetimeStr: string, fromTimezone: string): Date {
  // Handle different input formats
  let cleanedStr = datetimeStr;
  
  // If it's already an ISO string with timezone, parse directly
  if (datetimeStr.includes('T') && (datetimeStr.includes('+') || datetimeStr.includes('Z'))) {
    return new Date(datetimeStr);
  }
  
  // Convert space to T for ISO format
  if (datetimeStr.includes(' ') && !datetimeStr.includes('T')) {
    cleanedStr = datetimeStr.replace(' ', 'T');
  }
  
  // Create date in the specified timezone
  // We use Intl.DateTimeFormat to handle timezone conversion
  const parts = cleanedStr.split(/[T\s]/);
  const datePart = parts[0]; // YYYY-MM-DD
  const timePart = parts[1] || '00:00'; // HH:mm or HH:mm:ss
  
  // Parse components
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = 0] = timePart.split(':').map(Number);
  
  // Create a date string that will be interpreted in the specified timezone
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  
  // Get the offset for this timezone at this date/time
  const testDate = new Date(dateStr + 'Z'); // Start with UTC
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: fromTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Create the local date in the target timezone
  const localDate = new Date(year, month - 1, day, hour, minute, second);
  
  // Calculate offset
  const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(localDate.toLocaleString('en-US', { timeZone: fromTimezone }));
  const offset = utcDate.getTime() - tzDate.getTime();
  
  // Apply offset to get UTC time
  return new Date(localDate.getTime() - offset);
}

/**
 * Convert a UTC Date to a string in a specific timezone
 * @param utcDate - Date object (assumed to be in UTC)
 * @param toTimezone - IANA timezone string (e.g., "Europe/Vienna")
 * @returns ISO datetime string in the target timezone
 */
export function convertFromUTC(utcDate: Date, toTimezone: string): string {
  // Format the date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: toTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(utcDate);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Get the timezone for a specific account
 * @param accountId - Account ID
 * @returns Promise<string> - IANA timezone string
 */
export async function getAccountTimezone(accountId: string | undefined): Promise<string> {
  if (!accountId) {
    console.warn('⚠️ No accountId provided, using default timezone: Europe/Vienna');
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

/**
 * Format a datetime string for database storage (converts to UTC Date)
 * @param datetime - DateTime string from frontend (e.g., "2025-10-20T09:00")
 * @param accountTimezone - Account's timezone
 * @returns Date object in UTC for database storage
 */
export function formatForDatabase(datetime: string, accountTimezone: string): Date {
  return convertToUTC(datetime, accountTimezone);
}

/**
 * Format a UTC date from database for client response
 * @param utcDate - Date object or ISO string from database
 * @param accountTimezone - Account's timezone
 * @returns ISO datetime string in account timezone
 */
export function formatForClient(utcDate: Date | string, accountTimezone: string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return convertFromUTC(date, accountTimezone);
}

/**
 * Get current date in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentDateInTimezone(timezone: string): string {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Get current time in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Time string in HH:MM format
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  const now = new Date();
  return now.toLocaleTimeString('de-AT', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\./g, ':');
}

/**
 * Get current weekday in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Weekday name in German
 */
export function getCurrentWeekdayInTimezone(timezone: string): string {
  const now = new Date();
  return now.toLocaleDateString('de-AT', {
    timeZone: timezone,
    weekday: 'long'
  });
}

/**
 * Get full formatted date/time in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Full formatted date/time string
 */
export function getCurrentDateTimeInTimezone(timezone: string): string {
  const now = new Date();
  return now.toLocaleString('de-AT', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hour12: false
  });
}

/**
 * Calculate a relative date in a specific timezone
 * @param daysOffset - Number of days to add/subtract
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function calculateRelativeDateInTimezone(daysOffset: number, timezone: string): string {
  const now = new Date();
  // Get current date in the timezone
  const currentDate = getCurrentDateInTimezone(timezone);
  
  // Parse and add offset
  const date = new Date(currentDate);
  date.setDate(date.getDate() + daysOffset);
  
  return date.toISOString().split('T')[0];
}

