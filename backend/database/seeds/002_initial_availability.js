exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('availability_configs').del()
    .then(function () {
      // Inserts seed entries
      const weeklySchedule = {
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

      return knex('availability_configs').insert([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          weekly_schedule: JSON.stringify(weeklySchedule),
          is_active: true
        }
      ]);
    });
}; 