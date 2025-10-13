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
    
    // 7. Summary
    console.log('\n📋 SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total appointments: ${allAppointments.length}`);
    console.log(`Active appointments: ${activeAppointments.length}`);
    console.log(`Inactive appointments: ${allAppointments.length - activeAppointments.length}`);
    console.log('\nActive statuses: pending, booked, confirmed');
    console.log('Inactive statuses: cancelled, completed, noshow');
    console.log('\nNULL accountIds block ALL accounts (system-wide bookings)');
    
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

