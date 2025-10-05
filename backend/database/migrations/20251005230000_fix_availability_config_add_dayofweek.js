/**
 * Fix availability_configs to add dayOfWeek property to each day in weekly_schedule
 * This migration updates existing records to include the dayOfWeek property
 */

exports.up = async function(knex) {
  console.log('🔧 Fixing availability_configs: Adding dayOfWeek to weekly_schedule');
  
  // Get all availability configs
  const configs = await knex('availability_configs').select('*');
  
  const dayMapping = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 0
  };
  
  for (const config of configs) {
    try {
      // Parse the weekly_schedule JSON
      let weeklySchedule = typeof config.weekly_schedule === 'string' 
        ? JSON.parse(config.weekly_schedule) 
        : config.weekly_schedule;
      
      let needsUpdate = false;
      
      // Add dayOfWeek to each day if it's missing
      for (const [dayName, dayConfig] of Object.entries(weeklySchedule)) {
        if (dayMapping.hasOwnProperty(dayName) && !dayConfig.dayOfWeek) {
          dayConfig.dayOfWeek = dayMapping[dayName];
          needsUpdate = true;
          console.log(`  ✅ Added dayOfWeek=${dayMapping[dayName]} to ${dayName}`);
        }
      }
      
      // Update the config if changes were made
      if (needsUpdate) {
        await knex('availability_configs')
          .where('id', config.id)
          .update({
            weekly_schedule: JSON.stringify(weeklySchedule),
            updated_at: new Date()
          });
        console.log(`✅ Updated config ${config.id}`);
      } else {
        console.log(`⏭️  Config ${config.id} already has dayOfWeek properties`);
      }
    } catch (error) {
      console.error(`❌ Error updating config ${config.id}:`, error);
      throw error;
    }
  }
  
  console.log('✅ All availability configs fixed!');
};

exports.down = async function(knex) {
  console.log('🔄 Removing dayOfWeek from availability_configs');
  
  // Get all availability configs
  const configs = await knex('availability_configs').select('*');
  
  for (const config of configs) {
    try {
      // Parse the weekly_schedule JSON
      let weeklySchedule = typeof config.weekly_schedule === 'string' 
        ? JSON.parse(config.weekly_schedule) 
        : config.weekly_schedule;
      
      // Remove dayOfWeek from each day
      for (const dayConfig of Object.values(weeklySchedule)) {
        if (dayConfig.dayOfWeek !== undefined) {
          delete dayConfig.dayOfWeek;
        }
      }
      
      // Update the config
      await knex('availability_configs')
        .where('id', config.id)
        .update({
          weekly_schedule: JSON.stringify(weeklySchedule),
          updated_at: new Date()
        });
      console.log(`✅ Reverted config ${config.id}`);
    } catch (error) {
      console.error(`❌ Error reverting config ${config.id}:`, error);
      throw error;
    }
  }
  
  console.log('✅ All configs reverted!');
};

