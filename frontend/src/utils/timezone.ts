/**
 * Frontend timezone utilities for UTC datetime parsing and display
 * All datetimes from the backend are in UTC and need to be converted to local/browser timezone
 */

/**
 * Parse a UTC datetime string to a Date object
 * Handles various ISO formats from the backend
 * @param utcString - UTC datetime string (ISO 8601 format)
 * @returns Date object
 */
export function parseUTCToLocal(utcString: string): Date {
  if (!utcString) {
    console.warn('parseUTCToLocal: Empty datetime string provided');
    return new Date();
  }

  // Handle different formats
  let isoString = utcString;
  
  // If it's a space-separated format, convert to T
  if (utcString.includes(' ') && !utcString.includes('T')) {
    isoString = utcString.replace(' ', 'T');
  }
  
  // Ensure it ends with Z if it's UTC and doesn't have timezone info
  if (!isoString.includes('Z') && !isoString.includes('+') && !isoString.includes('-', 10)) {
    isoString += 'Z';
  }
  
  const date = new Date(isoString);
  
  if (isNaN(date.getTime())) {
    console.error('parseUTCToLocal: Invalid date string:', utcString);
    return new Date();
  }
  
  return date;
}

/**
 * Format a UTC datetime string for display (date part only)
 * @param utcString - UTC datetime string from backend
 * @param format - Optional format ('short' | 'long'), default 'short'
 * @returns Formatted date string in local timezone
 */
export function formatAppointmentDate(utcString: string, format: 'short' | 'long' = 'short'): string {
  const date = parseUTCToLocal(utcString);
  
  if (format === 'long') {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // Short format: DD.MM.YYYY
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Format a UTC datetime string for display (time part only)
 * @param utcString - UTC datetime string from backend
 * @param format - Optional format ('24h' | '12h'), default '24h'
 * @returns Formatted time string in local timezone
 */
export function formatAppointmentTime(utcString: string, format: '24h' | '12h' = '24h'): string {
  const date = parseUTCToLocal(utcString);
  
  if (format === '12h') {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // 24h format: HH:mm
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format a UTC datetime string for display (date and time)
 * @param utcString - UTC datetime string from backend
 * @returns Formatted datetime string in local timezone
 */
export function formatAppointmentDateTime(utcString: string): string {
  const date = parseUTCToLocal(utcString);
  
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Convert a local datetime-local input value to UTC ISO string for backend
 * @param localDatetimeString - Local datetime string from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns UTC ISO string for backend
 */
export function convertLocalToUTC(localDatetimeString: string): string {
  if (!localDatetimeString) {
    return '';
  }
  
  // datetime-local input gives us: "2025-10-20T09:00"
  // We need to interpret this as LOCAL time and convert to UTC
  const localDate = new Date(localDatetimeString);
  
  if (isNaN(localDate.getTime())) {
    console.error('convertLocalToUTC: Invalid date string:', localDatetimeString);
    return '';
  }
  
  return localDate.toISOString();
}

/**
 * Convert a UTC ISO string to local datetime-local input value
 * @param utcString - UTC ISO string from backend
 * @returns Local datetime string for datetime-local input (YYYY-MM-DDTHH:mm)
 */
export function convertUTCToLocalInput(utcString: string): string {
  const date = parseUTCToLocal(utcString);
  
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Get relative time description (e.g., "in 2 hours", "5 minutes ago")
 * @param utcString - UTC datetime string from backend
 * @returns Relative time description
 */
export function getRelativeTime(utcString: string): string {
  const date = parseUTCToLocal(utcString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 0) {
    // Past
    const absMins = Math.abs(diffMins);
    if (absMins < 60) {
      return `vor ${absMins} Minute${absMins !== 1 ? 'n' : ''}`;
    } else if (absMins < 1440) {
      const hours = Math.floor(absMins / 60);
      return `vor ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
    } else {
      const days = Math.floor(absMins / 1440);
      return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    }
  } else {
    // Future
    if (diffMins < 60) {
      return `in ${diffMins} Minute${diffMins !== 1 ? 'n' : ''}`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `in ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `in ${days} Tag${days !== 1 ? 'en' : ''}`;
    }
  }
}

