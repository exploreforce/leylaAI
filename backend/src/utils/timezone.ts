/**
 * Timezone utilities for consistent timezone date/time handling
 * Supports both legacy Vienna-only functions and new account-based timezone functions
 */

import { Database } from '../models/database';

export const TIMEZONE = 'Europe/Vienna'; // Legacy default

/**
 * Get current date in Vienna timezone (LEGACY - use getAccountDate instead)
 * @returns Date string in YYYY-MM-DD format
 */
export function getViennaDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/**
 * Get current time in Vienna timezone (LEGACY - use getAccountTime instead)
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
 * Get current weekday in Vienna timezone (LEGACY - use getAccountWeekday instead)
 * @returns Weekday name in German (e.g., "Montag", "Dienstag")
 */
export function getViennaWeekday(): string {
  return new Date().toLocaleDateString('de-AT', { 
    timeZone: TIMEZONE,
    weekday: 'long'
  });
}

/**
 * Get full formatted date/time in Vienna timezone (LEGACY - use getAccountDateTime instead)
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
 * Calculate a relative date in Vienna timezone (LEGACY - use calculateAccountRelativeDate instead)
 * @param daysOffset Number of days to add (positive) or subtract (negative) from today
 * @returns Date string in YYYY-MM-DD format
 */
export function calculateRelativeDate(daysOffset: number): string {
  const date = new Date();
  const viennaDate = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  viennaDate.setDate(viennaDate.getDate() + daysOffset);
  return viennaDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ========== NEW ACCOUNT-BASED TIMEZONE FUNCTIONS ==========

/**
 * Get current date in account's timezone
 * @param accountId - Account ID
 * @returns Promise<string> - Date string in YYYY-MM-DD format
 */
export async function getAccountDate(accountId: string | undefined): Promise<string> {
  const timezone = await Database.getAccountTimezone(accountId);
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Get current time in account's timezone
 * @param accountId - Account ID
 * @returns Promise<string> - Time string in HH:MM format
 */
export async function getAccountTime(accountId: string | undefined): Promise<string> {
  const timezone = await Database.getAccountTimezone(accountId);
  return new Date().toLocaleTimeString('de-AT', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\./g, ':');
}

/**
 * Get current weekday in account's timezone
 * @param accountId - Account ID
 * @returns Promise<string> - Weekday name in German
 */
export async function getAccountWeekday(accountId: string | undefined): Promise<string> {
  const timezone = await Database.getAccountTimezone(accountId);
  return new Date().toLocaleDateString('de-AT', {
    timeZone: timezone,
    weekday: 'long'
  });
}

/**
 * Get full formatted date/time in account's timezone
 * @param accountId - Account ID
 * @returns Promise<string> - Full formatted date/time string
 */
export async function getAccountDateTime(accountId: string | undefined): Promise<string> {
  const timezone = await Database.getAccountTimezone(accountId);
  return new Date().toLocaleString('de-AT', {
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
 * Calculate a relative date in account's timezone
 * @param daysOffset - Number of days to add/subtract
 * @param accountId - Account ID
 * @returns Promise<string> - Date string in YYYY-MM-DD format
 */
export async function calculateAccountRelativeDate(daysOffset: number, accountId: string | undefined): Promise<string> {
  const timezone = await Database.getAccountTimezone(accountId);
  const date = new Date();
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  tzDate.setDate(tzDate.getDate() + daysOffset);
  return tzDate.toISOString().split('T')[0];
}

/**
 * Get weekday name for a specific date in account's timezone
 * @param date - Date object or date string
 * @param accountId - Account ID
 * @returns Promise<string> - Weekday name in German
 */
export async function getWeekdayForDate(date: Date | string, accountId: string | undefined): Promise<string> {
  const timezone = await Database.getAccountTimezone(accountId);
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('de-AT', {
    timeZone: timezone,
    weekday: 'long'
  });
}

