// Füge echte Übersetzungen hinzu - Sprache für Sprache
const manualTranslations = {
  // RUSSISCH - Beispiel vollständig
  ru: {
    'common': {
      'actions.save': 'Сохранить',
      'actions.cancel': 'Отмена', 
      'actions.delete': 'Удалить',
      'actions.loading': 'Загрузка...',
      'navigation.dashboard': 'Панель управления',
      'navigation.settings': 'Настройки',
      'status.active': 'Активный',
      'status.inactive': 'Неактивный'
    },
    'dashboard': {
      'title': 'Панель управления Leyla AI',
      'appointments.title': 'Встречи',
      'appointments.today': 'Сегодня',
      'appointments.this_week': 'На этой неделе',
      'chats.title': 'Текущие чаты',
      'settings.title': 'Настройки'
    }
  },

  // SPANISCH - Beispiel
  es: {
    'common': {
      'actions.save': 'Guardar',
      'actions.cancel': 'Cancelar',
      'actions.delete': 'Eliminar',
      'navigation.dashboard': 'Panel de control',
      'navigation.settings': 'Configuración'
    },
    'dashboard': {
      'title': 'Panel de Leyla AI',
      'appointments.title': 'Citas',
      'chats.title': 'Chats actuales',
      'settings.title': 'Configuración'
    }
  },

  // ITALIENISCH
  it: {
    'common': {
      'actions.save': 'Salva',
      'actions.cancel': 'Annulla',
      'actions.delete': 'Elimina',
      'navigation.settings': 'Impostazioni'
    },
    'dashboard': {
      'title': 'Dashboard di Leyla AI',
      'settings.title': 'Impostazioni'
    }
  }

  // WEITERE SPRACHEN KÖNNEN HIER HINZUGEFÜGT WERDEN...
};

console.log('🔧 Manual translations ready to be applied!');
console.log('📝 Add your translations above and run: node scripts/apply-translations.js');

