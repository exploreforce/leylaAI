/**
 * Test script for timezone conversions
 * Run with: npx ts-node test-timezone.ts
 */

import { convertToUTC, convertFromUTC, getCurrentDateInTimezone, getCurrentTimeInTimezone } from './src/utils/timezoneUtils';

console.log('🧪 Testing Timezone Conversions with date-fns-tz\n');
console.log('='.repeat(60));

// Test Case 1: Vienna 13:00 → UTC 11:00 (October - CEST, UTC+2)
console.log('\n📍 Test 1: Vienna 13:00 → UTC (October, CEST)');
const test1 = convertToUTC('2025-10-15T13:00', 'Europe/Vienna');
console.log('   Result:', test1.toISOString());
console.log('   Expected: 2025-10-15T11:00:00.000Z');
console.log('   ✅ Pass:', test1.toISOString() === '2025-10-15T11:00:00.000Z' ? 'YES' : 'NO');

// Test Case 2: UTC → Vienna
console.log('\n📍 Test 2: UTC 11:00 → Vienna (October, CEST)');
const test2 = convertFromUTC(new Date('2025-10-15T11:00:00Z'), 'Europe/Vienna');
console.log('   Result:', test2);
console.log('   Expected: 2025-10-15T13:00:00');
console.log('   ✅ Pass:', test2 === '2025-10-15T13:00:00' ? 'YES' : 'NO');

// Test Case 3: Vienna 14:00 → UTC 12:00 (October - CEST, UTC+2)
console.log('\n📍 Test 3: Vienna 14:00 → UTC (October, CEST)');
const test3 = convertToUTC('2025-10-15 14:00', 'Europe/Vienna');
console.log('   Result:', test3.toISOString());
console.log('   Expected: 2025-10-15T12:00:00.000Z');
console.log('   ✅ Pass:', test3.toISOString() === '2025-10-15T12:00:00.000Z' ? 'YES' : 'NO');

// Test Case 4: DST transition (March - switching from CET to CEST)
console.log('\n📍 Test 4: DST Transition (March 30, 2025)');
const test4 = convertToUTC('2025-03-30T02:30', 'Europe/Vienna');
console.log('   Result:', test4.toISOString());
console.log('   Note: This time might not exist due to DST jump');

// Test Case 5: Winter time (January - CET, UTC+1)
console.log('\n📍 Test 5: Vienna 13:00 → UTC (January, CET)');
const test5 = convertToUTC('2025-01-15T13:00', 'Europe/Vienna');
console.log('   Result:', test5.toISOString());
console.log('   Expected: 2025-01-15T12:00:00.000Z (CET is UTC+1)');
console.log('   ✅ Pass:', test5.toISOString() === '2025-01-15T12:00:00.000Z' ? 'YES' : 'NO');

// Test Case 6: Current time in timezone
console.log('\n📍 Test 6: Current date/time in Vienna');
const currentDate = getCurrentDateInTimezone('Europe/Vienna');
const currentTime = getCurrentTimeInTimezone('Europe/Vienna');
console.log('   Current Date:', currentDate);
console.log('   Current Time:', currentTime);
console.log('   Format: YYYY-MM-DD and HH:mm');

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed!\n');

