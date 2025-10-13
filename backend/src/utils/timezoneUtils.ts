/**
 * Timezone utility functions using date-fns-tz
 * Battle-tested library for accurate timezone conversions
 */

import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';
import { parseISO, format, addDays } from 'date-fns';
import { db } from '../models/database';

/**
 * Convert a datetime string from a specific timezone to UTC
 * @param datetimeStr - DateTime string in format "YYYY-MM-DD HH:mm" or ISO format
 * @param fromTimezone - IANA timezone string (e.g., "Europe/Vienna")
 * @returns Date object in UTC
 */
export function convertToUTC(datetimeStr: string, fromTimezone: string): Date {
  // If it's already an ISO string with timezone indicator, parse directly
  if (datetimeStr.includes('Z') || (datetimeStr.includes('+') && datetimeStr.includes('T'))) {
    return parseISO(datetimeStr);
  }
  
  // Normalize format: replace space with T
  let normalized = datetimeStr.trim();
  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T');
  }
  
  // Ensure we have seconds (date-fns-tz expects full ISO format)
  if (!normalized.includes(':00:') && normalized.split(':').length === 2) {
    normalized += ':00';
  }
  
  // Use date-fns-tz to convert from source timezone to UTC
  // This handles DST transitions and all edge cases automatically
  const utcDate = fromZonedTime(normalized, fromTimezone);
  
  console.log(`🕐 Timezone conversion: "${datetimeStr}" in ${fromTimezone} → UTC ${utcDate.toISOString()}`);
  
  return utcDate;
}

/**
 * Convert a UTC Date to a string in a specific timezone
 * @param utcDate - Date object (assumed to be in UTC)
 * @param toTimezone - IANA timezone string (e.g., "Europe/Vienna")
 * @returns ISO datetime string in the target timezone
 */
export function convertFromUTC(utcDate: Date, toTimezone: string): string {
  // Convert UTC date to target timezone
  const zonedDate = toZonedTime(utcDate, toTimezone);
  
  // Format as ISO string without timezone suffix
  return formatTz(zonedDate, "yyyy-MM-dd'T'HH:mm:ss", { timeZone: toTimezone });
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
 * @param datetime - DateTime string from AI or frontend (e.g., "2025-10-20T09:00")
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
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return convertFromUTC(date, accountTimezone);
}

/**
 * Get current date in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentDateInTimezone(timezone: string): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, timezone);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Get current time in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Time string in HH:mm format
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, timezone);
  return format(zonedDate, 'HH:mm');
}

/**
 * Get current weekday in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Weekday name in German
 */
export function getCurrentWeekdayInTimezone(timezone: string): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, timezone);
  
  // Use Intl for German weekday names
  return zonedDate.toLocaleDateString('de-AT', {
    timeZone: timezone,
    weekday: 'long'
  });
}

/**
 * Get full formatted date/time in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Full formatted date/time string in German
 */
export function getCurrentDateTimeInTimezone(timezone: string): string {
  const now = new Date();
  const zonedDate = toZonedTime(now, timezone);
  
  return zonedDate.toLocaleString('de-AT', {
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
  const zonedDate = toZonedTime(now, timezone);
  const offsetDate = addDays(zonedDate, daysOffset);
  
  return format(offsetDate, 'yyyy-MM-dd');
}
