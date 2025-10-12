/**
 * Timezone utilities for consistent Europe/Vienna date/time handling
 */

export const TIMEZONE = 'Europe/Vienna';

/**
 * Get current date in Vienna timezone
 * @returns Date string in YYYY-MM-DD format
 */
export function getViennaDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/**
 * Get current time in Vienna timezone
 * @returns Time string in HH:MM format
 */
export function getViennaTime(): string {
  return new Date().toLocaleTimeString('de-AT', { 
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\./g, ':'); // Replace dots with colons if any
}

/**
 * Get current weekday in Vienna timezone
 * @returns Weekday name in German (e.g., "Montag", "Dienstag")
 */
export function getViennaWeekday(): string {
  return new Date().toLocaleDateString('de-AT', { 
    timeZone: TIMEZONE,
    weekday: 'long'
  });
}

/**
 * Get full formatted date/time in Vienna timezone
 * @returns Full date/time string in German format
 */
export function getViennaDateTime(): string {
  return new Date().toLocaleString('de-AT', {
    timeZone: TIMEZONE,
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
 * Calculate a relative date in Vienna timezone
 * @param daysOffset Number of days to add (positive) or subtract (negative) from today
 * @returns Date string in YYYY-MM-DD format
 */
export function calculateRelativeDate(daysOffset: number): string {
  const date = new Date();
  const viennaDate = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  viennaDate.setDate(viennaDate.getDate() + daysOffset);
  return viennaDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

