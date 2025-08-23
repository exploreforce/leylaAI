exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('availability_configs').del()
    .then(function () {
      // Inserts seed entries
      const weeklySchedule = {
        monday: {
          isAvailable: true,
          timeSlots: [
            { start: '09:00', end: '12:00' },
            { start: '13:00', end: '17:00' }
          ]
        },
        tuesday: {
          isAvailable: true,
          timeSlots: [
            { start: '09:00', end: '12:00' },
            { start: '13:00', end: '17:00' }
          ]
        },
        wednesday: {
          isAvailable: true,
          timeSlots: [
            { start: '09:00', end: '12:00' },
            { start: '13:00', end: '17:00' }
          ]
        },
        thursday: {
          isAvailable: true,
          timeSlots: [
            { start: '09:00', end: '12:00' },
            { start: '13:00', end: '17:00' }
          ]
        },
        friday: {
          isAvailable: true,
          timeSlots: [
            { start: '09:00', end: '12:00' },
            { start: '13:00', end: '17:00' }
          ]
        },
        saturday: {
          isAvailable: false,
          timeSlots: []
        },
        sunday: {
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