const fs = require('fs');
const path = require('path');

// Language mappings from our database seed
const languages = [
  { code: 'ru', name: 'Russian' },
  { code: 'pl', name: 'Polish' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'sq', name: 'Albanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'et', name: 'Estonian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'be', name: 'Belarusian' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'el', name: 'Greek' },
  { code: 'th', name: 'Thai' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'vi', name: 'Vietnamese' },
];

// Basic translations (we'll use English as base and add language-specific adjustments)
const baseTranslations = {
  common: {
    "brand": {
      "name": "Leyla AI",
      "tagline": "Intelligent Assistant",
      "logo_alt": "Leyla AI Logo"
    },
    "navigation": {
      "dashboard": "Dashboard",
      "back_to_dashboard": "← Back to Dashboard",
      "desktop_view": "Desktop View"
    },
    "actions": {
      "save": "Save",
      "delete": "Delete",
      "edit": "Edit",
      "cancel": "Cancel",
      "close": "Close",
      "confirm": "Confirm",
      "loading": "Loading...",
      "saving": "Saving...",
      "search": "Search",
      "filter": "Filter",
      "export": "Export",
      "import": "Import"
    },
    "status": {
      "active": "Active",
      "inactive": "Inactive",
      "archived": "Archived",
      "pending": "Pending",
      "completed": "Completed",
      "cancelled": "Cancelled",
      "confirmed": "Confirmed"
    },
    "time": {
      "today": "Today",
      "yesterday": "Yesterday",
      "tomorrow": "Tomorrow",
      "this_week": "This Week",
      "last_week": "Last Week",
      "this_month": "This Month",
      "last_activity": "Last Activity",
      "created": "Created",
      "updated": "Updated"
    },
    "messages": {
      "success": "Success!",
      "error": "Error occurred",
      "warning": "Warning",
      "info": "Information",
      "loading": "Loading data...",
      "no_data": "No data available",
      "saved": "Saved",
      "deleted": "Deleted"
    }
  },
  dashboard: {
    "title": "Leyla AI Dashboard",
    "welcome": "Welcome back!",
    "appointments": {
      "title": "Appointments",
      "today": "Today",
      "this_week": "This Week",
      "manage_calendar": "Manage Calendar",
      "total_appointments": "Total Appointments",
      "upcoming": "Upcoming"
    },
    "chats": {
      "title": "Current Chats",
      "current": "Current Chats",
      "view_all": "View All Chats",
      "active_conversations": "Active Conversations",
      "total_sessions": "Total Sessions"
    },
    "reviews": {
      "title": "Needs Review",
      "pending_approvals": "Pending Approvals",
      "review_messages": "Review Messages",
      "items_to_review": "Items to Review",
      "no_reviews_needed": "No review needed"
    },
    "settings": {
      "title": "Settings",
      "description": "Bot configuration & settings",
      "button": "Settings",
      "configure": "Configure",
      "system_ready": "System ready for configuration"
    },
    "quick_actions": {
      "new_chat": "+ New AI Chat",
      "start_chat": "Start AI Chat",
      "view_calendar": "View Calendar",
      "manage_settings": "Manage Settings"
    },
    "stats": {
      "loading": "Loading dashboard statistics...",
      "error": "Error loading statistics",
      "last_updated": "Last updated"
    }
  },
  settings: {
    "title": "Settings",
    "subtitle": "Leyla AI Configuration",
    "tabs": {
      "bot_config": "Bot Configuration",
      "services": "Services & Prices",
      "settings": "Settings"
    },
    "language": {
      "title": "Language Settings",
      "subtitle": "Choose your preferred language for bot responses.",
      "select_language": "Select Language",
      "current_language": "Current Language",
      "change_success": "Language updated successfully!",
      "change_error": "Error updating language",
      "loading": "Loading language settings..."
    },
    "actions": {
      "save": "Save",
      "saving": "Saving...",
      "cancel": "Cancel",
      "reset": "Reset"
    },
    "messages": {
      "config_saved": "Bot configuration saved successfully!",
      "config_error": "Error saving configuration",
      "loading_config": "Loading bot configuration..."
    }
  }
};

// Create directories and files for each language
const createTranslationFiles = async () => {
  console.log('🌍 Generating translation files for all languages...');

  for (const lang of languages) {
    const langDir = path.join(__dirname, '..', 'public', 'locales', lang.code);
    
    // Create language directory if it doesn't exist
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    // Create translation files
    for (const [namespace, translations] of Object.entries(baseTranslations)) {
      const filePath = path.join(langDir, `${namespace}.json`);
      
      // For now, we'll use English as base (in a real implementation, you'd use proper translation service)
      // This creates the structure so translations can be added manually or via translation service
      fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
      console.log(`✅ Created ${lang.code}/${namespace}.json`);
    }
  }

  console.log('🎉 Translation files generated successfully!');
  console.log('📝 Note: All files currently contain English text as placeholders.');
  console.log('🔄 You can now replace with proper translations for each language.');
};

createTranslationFiles().catch(console.error);

