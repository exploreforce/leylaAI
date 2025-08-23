/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('availability_configs').del();
  
  // Default weekly schedule (Monday to Friday, 9 AM to 5 PM)
  const defaultWeeklySchedule = {
    monday: {
      dayOfWeek: 1,
      isAvailable: true,
      timeSlots: [
        { start: '09:00', end: '12:00' },
        { start: '13:00', end: '17:00' }
      ]
    },
    tuesday: {
      dayOfWeek: 2,
      isAvailable: true,
      timeSlots: [
        { start: '09:00', end: '12:00' },
        { start: '13:00', end: '17:00' }
      ]
    },
    wednesday: {
      dayOfWeek: 3,
      isAvailable: true,
      timeSlots: [
        { start: '09:00', end: '12:00' },
        { start: '13:00', end: '17:00' }
      ]
    },
    thursday: {
      dayOfWeek: 4,
      isAvailable: true,
      timeSlots: [
        { start: '09:00', end: '12:00' },
        { start: '13:00', end: '17:00' }
      ]
    },
    friday: {
      dayOfWeek: 5,
      isAvailable: true,
      timeSlots: [
        { start: '09:00', end: '12:00' },
        { start: '13:00', end: '17:00' }
      ]
    },
    saturday: {
      dayOfWeek: 6,
      isAvailable: false,
      timeSlots: []
    },
    sunday: {
      dayOfWeek: 0,
      isAvailable: false,
      timeSlots: []
    }
  };
  
  // Inserts seed entries
  await knex('availability_configs').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      weekly_schedule: JSON.stringify(defaultWeeklySchedule),
      is_active: true
    }
  ]);
}; 