/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('bot_configs', table => {
    // Bot Identity
    table.string('bot_name').defaultTo('AI Assistant');
    table.text('bot_description').defaultTo('Ein hilfreicher AI-Assistent für Terminbuchungen');
    
    // Extended Tonality Options
    table.enum('personality_tone', [
      'professional', 'friendly', 'casual', 
      'flirtatious', 'direct', 'emotional', 
      'warm', 'confident', 'playful'
    ]).defaultTo('friendly');
    
    // Character Traits
    table.text('character_traits').defaultTo('Hilfsbereit, geduldig, verständnisvoll');
    
    // Background Information
    table.text('background_info').defaultTo('Ich bin ein AI-Assistent, der dabei hilft, Termine zu koordinieren');
    
    // Services/Offerings
    table.text('services_offered').defaultTo('Terminbuchung, Terminverwaltung, Informationen zu Verfügbarkeiten');
    
    // Human-in-the-loop Escalation Rules
    table.text('escalation_rules').defaultTo('Bei komplexen Anfragen oder Beschwerden weiterleiten');
    
    // Bot Limitations/Boundaries
    table.text('bot_limitations').defaultTo('Keine medizinischen Beratungen, keine Rechtsberatung, keine persönlichen Informationen preisgeben');
    
    // Auto-generated system prompt storage
    table.text('generated_system_prompt');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('bot_configs', table => {
    table.dropColumn('bot_name');
    table.dropColumn('bot_description');
    table.dropColumn('personality_tone');
    table.dropColumn('character_traits');
    table.dropColumn('background_info');
    table.dropColumn('services_offered');
    table.dropColumn('escalation_rules');
    table.dropColumn('bot_limitations');
    table.dropColumn('generated_system_prompt');
  });
};
