/**
 * Diagnostic script to test availability check logic
 * Tests status filtering and accountId handling
 * 
 * Usage: npx ts-node backend/diagnose-availability.ts [date]
 * Example: npx ts-node backend/diagnose-availability.ts 2025-10-15
 */

import { db, Database } from './src/models/database';
import moment from 'moment';

async function diagnoseAvailability(testDate: string) {
  console.log('='.repeat(80));
  console.log(`🔍 AVAILABILITY DIAGNOSTIC FOR: ${testDate}`);
  console.log('='.repeat(80));
  
  try {
    // 1. Get ALL appointments on that date (no filters)
    console.log('\n📅 1. ALL APPOINTMENTS (no filters):');
    console.log('-'.repeat(80));
    const allAppointments = await db('appointments')
      .select('*')
      .where('datetime', '>=', `${testDate} 00:00`)
      .where('datetime', '<=', `${testDate} 23:59`)
      .orderBy('datetime', 'asc');
    
    console.log(`Found ${allAppointments.length} total appointments`);
    if (allAppointments.length === 0) {
      console.log('   ⚠️ No appointments found for this date');
    } else {
      allAppointments.forEach((apt, idx) => {
        console.log(`   ${idx + 1}. ${apt.customer_name || 'N/A'}`);
        console.log(`      ID: ${apt.id}`);
        console.log(`      DateTime: ${apt.datetime}`);
        console.log(`      Duration: ${apt.duration} minutes`);
        console.log(`      Status: ${apt.status}`);
        console.log(`      AccountId: ${apt.account_id || 'NULL (system-wide)'}`);
        console.log('');
      });
    }
    
    // 2. Get appointments using Database.getAppointments with default behavior
    console.log('\n📅 2. ACTIVE APPOINTMENTS (includeInactive: false, default):');
    console.log('-'.repeat(80));
    const activeAppointments = await Database.getAppointments({
      startDateStr: testDate,
      endDateStr: testDate,
      includeInactive: false
    });
    console.log(`Found ${activeAppointments.length} active appointments`);
    if (activeAppointments.length > 0) {
      activeAppointments.forEach((apt, idx) => {
        console.log(`   ${idx + 1}. ${apt.customerName}`);
        console.log(`      DateTime: ${apt.datetime}`);
        console.log(`      Duration: ${apt.duration} minutes`);
        console.log(`      Status: ${apt.status}`);
        console.log(`      AccountId: ${apt.accountId || 'NULL'}`);
        console.log('');
      });
    }
    
    // 3. Get ALL appointments including inactive
    console.log('\n📅 3. ALL APPOINTMENTS (includeInactive: true):');
    console.log('-'.repeat(80));
    const allAppointmentsViaDb = await Database.getAppointments({
      startDateStr: testDate,
      endDateStr: testDate,
      includeInactive: true
    });
    console.log(`Found ${allAppointmentsViaDb.length} total appointments (all statuses)`);
    
    // 4. Show status breakdown
    console.log('\n📊 4. STATUS BREAKDOWN:');
    console.log('-'.repeat(80));
    const statusCounts: { [key: string]: number } = {};
    allAppointments.forEach(apt => {
      statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      const isActive = ['pending', 'booked', 'confirmed'].includes(status);
      const indicator = isActive ? '✅ ACTIVE' : '❌ INACTIVE';
      console.log(`   ${status.padEnd(15)} : ${count} ${indicator}`);
    });
    
    // 5. Show accountId breakdown
    console.log('\n👥 5. ACCOUNT ID BREAKDOWN:');
    console.log('-'.repeat(80));
    const accountCounts: { [key: string]: number } = {};
    allAppointments.forEach(apt => {
      const accountKey = apt.account_id || 'NULL (system-wide)';
      accountCounts[accountKey] = (accountCounts[accountKey] || 0) + 1;
    });
    
    Object.entries(accountCounts).forEach(([accountId, count]) => {
      console.log(`   ${accountId}: ${count} appointment(s)`);
    });
    
    // 6. Test specific accountId filter
    console.log('\n🔍 6. TEST ACCOUNT FILTER:');
    console.log('-'.repeat(80));
    const uniqueAccountIds = [...new Set(allAppointments.map(a => a.account_id).filter(Boolean))];
    
    if (uniqueAccountIds.length > 0) {
      const testAccountId = uniqueAccountIds[0];
      console.log(`Testing with accountId: ${testAccountId}`);
      
      const accountFilteredAppointments = await Database.getAppointments({
        startDateStr: testDate,
        endDateStr: testDate,
        accountId: testAccountId,
        includeInactive: false
      });
      
      console.log(`   Found ${accountFilteredAppointments.length} active appointments for this account`);
      console.log(`   (Includes NULL accountIds which block all accounts)`);
      
      const nullAppointments = accountFilteredAppointments.filter(a => !a.accountId);
      if (nullAppointments.length > 0) {
        console.log(`   ⚠️ ${nullAppointments.length} NULL accountId appointment(s) found (system-wide)`);
      }
    } else {
      console.log('   ℹ️ No appointments with accountId found');
    }
    
    // 7. Test Overlap Detection
    console.log('\n🔍 7. OVERLAP DETECTION TEST:');
    console.log('-'.repeat(80));
    
    if (activeAppointments.length > 0) {
      console.log('Testing overlap logic with active appointments:\n');
      
      activeAppointments.forEach((appt, idx) => {
        const apptStart = moment(String(appt.datetime));
        const apptEnd = apptStart.clone().add(appt.duration, 'minutes');
        
        console.log(`Appointment ${idx + 1}: ${appt.customerName}`);
        console.log(`  Time: ${apptStart.format('HH:mm')} - ${apptEnd.format('HH:mm')} (${appt.duration} min)`);
        console.log(`  Status: ${appt.status}`);
        
        // Test various slot scenarios
        const testSlots = [
          { start: apptStart.clone().subtract(60, 'minutes'), name: '1h before' },
          { start: apptStart.clone().subtract(30, 'minutes'), name: '30min before (would overlap end)' },
          { start: apptStart.clone(), name: 'exact same time' },
          { start: apptStart.clone().add(15, 'minutes'), name: '15min after start (overlap)' },
          { start: apptStart.clone().add(30, 'minutes'), name: '30min after start (overlap)' },
          { start: apptEnd.clone(), name: 'exact end time (should NOT overlap)' },
          { start: apptEnd.clone().add(30, 'minutes'), name: '30min after end' },
        ];
        
        testSlots.forEach(test => {
          const slotStart = test.start;
          const slotEnd = slotStart.clone().add(60, 'minutes'); // 60-min test slot
          
          // Correct overlap logic: slotStart < apptEnd AND slotEnd > apptStart
          const overlaps = slotStart.isBefore(apptEnd) && slotEnd.isAfter(apptStart);
          const symbol = overlaps ? '❌ BLOCKS' : '✅ ALLOWS';
          
          console.log(`    ${symbol} ${test.name}: ${slotStart.format('HH:mm')}-${slotEnd.format('HH:mm')}`);
        });
        console.log('');
      });
      
      // Check for overlapping appointments
      console.log('\nChecking for overlapping appointments:');
      for (let i = 0; i < activeAppointments.length; i++) {
        for (let j = i + 1; j < activeAppointments.length; j++) {
          const appt1Start = moment(String(activeAppointments[i].datetime));
          const appt1End = appt1Start.clone().add(activeAppointments[i].duration, 'minutes');
          const appt2Start = moment(String(activeAppointments[j].datetime));
          const appt2End = appt2Start.clone().add(activeAppointments[j].duration, 'minutes');
          
          const overlaps = appt1Start.isBefore(appt2End) && appt1End.isAfter(appt2Start);
          
          if (overlaps) {
            console.log(`  ⚠️  OVERLAP DETECTED!`);
            console.log(`     ${activeAppointments[i].customerName}: ${appt1Start.format('HH:mm')}-${appt1End.format('HH:mm')}`);
            console.log(`     ${activeAppointments[j].customerName}: ${appt2Start.format('HH:mm')}-${appt2End.format('HH:mm')}`);
          }
        }
      }
      if (activeAppointments.length < 2) {
        console.log('  (Need at least 2 appointments to test overlaps)');
      }
    } else {
      console.log('No active appointments to test overlap detection.');
    }
    
    // 8. Summary
    console.log('\n📋 SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total appointments: ${allAppointments.length}`);
    console.log(`Active appointments: ${activeAppointments.length}`);
    console.log(`Inactive appointments: ${allAppointments.length - activeAppointments.length}`);
    console.log('\nActive statuses: pending, booked, confirmed');
    console.log('Inactive statuses: cancelled, completed, noshow');
    console.log('\nNULL accountIds block ALL accounts (system-wide bookings)');
    console.log('\nOverlap Detection Logic:');
    console.log('  Two time periods overlap if: slotStart < apptEnd AND slotEnd > apptStart');
    console.log('  Adjacent appointments (end time = start time) do NOT overlap');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await db.destroy();
  }
}

// Main execution
const testDate = process.argv[2] || moment().format('YYYY-MM-DD');
console.log(`Using test date: ${testDate}\n`);

diagnoseAvailability(testDate)
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

