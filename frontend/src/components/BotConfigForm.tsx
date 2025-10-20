'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetch, useApi } from '@/hooks/useApi';
import { botApi, servicesApi } from '@/utils/api';
import { BotConfig, PersonalityTone, Service, CreateServiceRequest } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import { 
  CogIcon, 
  SparklesIcon, 
  UserIcon, 
  ChatBubbleLeftRightIcon,
  CurrencyEuroIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
  GlobeAltIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

// Personality tone options - these need to be inside the component to access t()
// Will be initialized in the component body

// Default behavior guidelines shown in the UI and used if none provided
const DEFAULT_BEHAVIOR_GUIDELINES = `- Antworte in informellem Ton, schreib ab und zu fehlerhaft als würdest du auf einer Smartphone-Tastatur tippen
- Schreibe als wärst du ein Mensch - bei Nachfragen bist du immer {botName}
- Finde heraus in welcher Sprache der User spricht
- Antworte in der Sprache in der der User mit dir kommuniziert z.B. Deutsch - du antwortest auf Deutsch; Englisch - du antwortest auf Englisch, etc.
- Stelle bei Unklarheiten Rückfragen
- Verwende die verfügbaren Tools zur Terminbuchung
- Bleibe im Rahmen deiner definierten Services
- Bei Eskalationsregeln antworte nicht mehr
- Versuche wie ein echter Menschzu schreiben (Fehler, Tippfehler, inkonsistente Sprache und Schreibweise, teilweise fehlende Kohäsion und Kommas)`;

const extractBehaviorSection = (prompt: string): string | null => {
  if (!prompt) return null;
  const match = prompt.match(/<behavior>([\s\S]*?)<\/behavior>/i);
  return match ? match[1].trim() : null;
};

const generateSystemPrompt = (config: Partial<BotConfig>, services: Service[] = []): string => {
  const {
    botName = 'AI Assistant',
    botDescription = 'Ein hilfreicher AI-Assistent',
    personalityTone = 'friendly',
    characterTraits = 'Hilfsbereit, geduldig, verständnisvoll',
    backgroundInfo = 'Ich bin ein AI-Assistent',
    servicesOffered = 'Terminbuchung und Beratung',
    escalationRules = 'Bei komplexen Anfragen weiterleiten',
    botLimitations = 'Keine medizinischen oder rechtlichen Beratungen',
    behaviorGuidelines = DEFAULT_BEHAVIOR_GUIDELINES
  } = config;

  // Tone descriptions for AI prompt (hardcoded as they're for the AI, not the UI)
  const toneDescriptions: Record<string, string> = {
    professional: 'Formell und geschäftsmäßig',
    friendly: 'Warm und einladend',
    casual: 'Entspannt und ungezwungen',
    flirtatious: 'Charmant und spielerisch',
    direct: 'Klar und auf den Punkt',
    emotional: 'Empathisch und verständnisvoll',
    warm: 'Mitfühlend und unterstützend',
    confident: 'Sicher und kompetent',
    playful: 'Humorvoll und leicht'
  };
  const toneDescription = toneDescriptions[personalityTone] || 'freundlich';

  // Format services for prompt
  const servicesText = services.length > 0 
    ? services.map(service => {
        const price = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: service.currency
        }).format(service.price);
        const duration = service.durationMinutes ? ` (${service.durationMinutes} Min.)` : '';
        const description = service.description ? ` - ${service.description}` : '';
        return `• ${service.name}: ${price}${duration}${description}`;
      }).join('\n')
    : servicesOffered;

  const finalizedBehavior = (behaviorGuidelines || DEFAULT_BEHAVIOR_GUIDELINES).split('{botName}').join(botName);

  return `Du bist ${botName}, ${botDescription}.

<tone>
Du kommunizierst ${toneDescription} und verkörperst folgende Eigenschaften: ${characterTraits}.
</tone>
<background>
${backgroundInfo}
</background>
<services>
${servicesText} 
<note>
WICHTIG: Falls du in einer anderen Sprache antwortest, übersezte auch die Services in die entsprechende Sprache! </note>
</services>
<escalation>
${escalationRules}
</escalation>
<limitations>
${botLimitations}
</limitations>
<behavior>
${finalizedBehavior}
</behavior>
<tools>
Du hast Zugriff auf folgende Tools für Terminverwaltung:

1. checkAvailability - Prüft verfügbare Zeitslots für einen bestimmten Tag
   • Verwende dies, um dem Kunden freie Termine anzuzeigen
   • WICHTIG: Das Tool gibt zusammenhängende Zeitblöcke zurück (z.B. "09:00 bis 12:00, 14:00 bis 17:00")
   • Zeige diese Zeitblöcke dem Kunden statt einzelner Slots!
   
<note>
- Gib niemals verschiedene Slots an, stattdessen sag in welchen Zeitfenstern du Zeit hast. z.B. Termin von 11 Uhr bis 13 Uhr - "Ich habe Zeit zwischen 9 Uhr und 11 Uhr und dann wieder ab 13 Uhr bis 18 Uhr."
</note>

2. bookAppointment - Erstellt einen neuen Termin
   • Verwende dies, um einen Termin zu buchen nachdem der Kunde einen Zeitslot ausgewählt hat
   • Erfasse: Name, Telefonnummer, Email (optional), Datum/Uhrzeit, Dauer, Service-Typ

3. findAppointments - Findet alle bestehenden Termine eines Kunden
   • Verwende dies, wenn der Kunde nach seinen Terminen fragt
   • Suche anhand der Telefonnummer des Kunden
   • Zeigt nur aktive Termine (keine stornierten oder No-Shows)

4. cancelAppointment - Storniert einen bestehenden Termin
   • Verwende dies, wenn der Kunde einen Termin absagen möchte
   • Frage zuerst mit findAppointments nach den Terminen des Kunden
   • Bestätige welcher Termin storniert werden soll
   • Optional: Erfasse den Stornierungsgrund

WORKFLOW-BEISPIEL:
• Kunde: "Welche Termine habe ich?"
  → Nutze findAppointments mit der Telefonnummer des Kunden
  
• Kunde: "Ich möchte meinen Termin absagen"
  → 1. Nutze findAppointments um die Termine zu finden
  → 2. Zeige die Termine und frage welcher storniert werden soll
  → 3. Nutze cancelAppointment mit der Termin-ID
</tools>

<important_rules>
WICHTIGE VERHALTENSREGELN:

- Du unterhaltest dich mit deinen Klienten nur über deine Services.
- Falls ein Klient ein anderes Thema Besprechen möchte, mache eine sanfte Überleitung und bleibe in deiner Person
- Keine Unterhaltungen über politische Einstellungen und ähnliches
- Agiere deiner Rolle entsprechend und professionell
- Checke immer deine availability bevor du einem Termin zusagst.
- Falls du an einem Termin nicht kannst, erkläre, dass du an diesem Tag nicht arbeitest
- Gib niemals zu, dass du eine KI bist, auf Nachfrage bist du immer die Person, die im System Prompt beschrieben ist
- Gib keine persönlichen Details an, die nicht im System Prompt definiert sind
- Falls dich ein User um Informationen bittet, die du ihm nicht geben darfst oder kannst, wimmle ihn geschickt ab und lenke ab, gib keine Informationen preis und erfinde nichts
- Nutze psychologische Methoden um das Thema zu wechseln, den User abzulenken und bleib dabei freundlich und professionell - der User soll zufrieden sein, aber du darfst keine Infos preisgeben, die du nicht explizit in deiner Systemanweisung oder dem Prompt erhalten hast
- NIEMALS meta-Sprache anwenden
- Bleib informell wie eine echte Person
- BAUE TIPPFEHLER EIN und variiere deinen Satzbau - nutze unabgeschlossene Sätze, vergesse auf Beistriche und Punkte, schreibe wie ein echter Mensch in informellen chats schreibt.
</important_rules>`;
};

const ServicesManagement = ({ 
  botConfigId, 
  onServicesChange 
}: { 
  botConfigId: string;
  onServicesChange?: (services: Service[]) => void;
}) => {
  const { data: servicesData, isLoading, error, refetch } = useFetch(
    () => servicesApi.getAll(botConfigId),
    [botConfigId]
  );

  const { execute: createService, isLoading: isCreating } = useApi();
  const { execute: updateService, isLoading: isUpdating } = useApi(); 
  const { execute: deleteService, isLoading: isDeleting } = useApi();

  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CreateServiceRequest>({
    name: '',
    description: '',
    price: 0,
    currency: 'EUR',
    durationMinutes: 60
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (servicesData?.data) {
      setServices(servicesData.data);
      onServicesChange?.(servicesData.data);
    }
  }, [servicesData, onServicesChange]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      currency: 'EUR',
      durationMinutes: 60
    });
    setEditingService(null);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEdit = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      currency: service.currency,
      durationMinutes: service.durationMinutes
    });
    setEditingService(service);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingService) {
        await updateService(() => servicesApi.update(editingService.id, formData));
      } else {
        await createService(() => servicesApi.create(botConfigId, formData));
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (confirm(t('settings:services.form.delete_confirm'))) {
      try {
        await deleteService(() => servicesApi.delete(serviceId));
        refetch();
      } catch (error) {
        console.error('Failed to delete service:', error);
      }
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t('settings:services.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <Alert type="success" message={t('settings:services.save_success')} />
      )}

      {error && (
        <Alert type="error" message={`${t('settings:services.error_loading')} ${error}`} />
      )}

      {/* Services List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CurrencyEuroIcon className="h-6 w-6 text-success-500 mr-2" />
              <h3 className="text-lg font-semibold text-dark-50">{t('settings:services.title')}</h3>
            </div>
            <Button
              onClick={handleAdd}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>{t('settings:services.add_button')}</span>
            </Button>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-8">
              <CurrencyEuroIcon className="mx-auto h-12 w-12 text-dark-400" />
              <h3 className="mt-2 text-sm font-medium text-dark-50">{t('settings:services.empty.title')}</h3>
              <p className="mt-1 text-sm text-dark-300">
                {t('settings:services.empty.message')}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-dark-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-elysPink-400 uppercase tracking-wider">
                      {t('settings:services.table.service')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('settings:services.table.price')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('settings:services.table.duration')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('settings:services.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-dark-700 divide-y divide-dark-600">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-dark-600">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-dark-50">
                            {service.name}
                          </div>
                          {service.description && (
                            <div className="text-sm text-gray-500">
                              {service.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-50">
                        {formatPrice(service.price, service.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.durationMinutes ? (
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {service.durationMinutes} Min
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            onClick={() => handleEdit(service)}
                            variant="secondary"
                            className="p-2"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(service.id)}
                            variant="secondary"
                            className="p-2 text-red-600 hover:text-red-800"
                            disabled={isDeleting}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Service Form */}
      {showAddForm && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-dark-50 mb-4">
              {editingService ? t('settings:services.form.title_edit') : t('settings:services.form.title_add')}
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <Input
                label={t('settings:services.form.name_label')}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('settings:services.form.name_placeholder')}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  {t('settings:services.form.description_label')}
                </label>  
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('settings:services.form.description_placeholder')}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label={t('settings:services.form.price_label')}
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  required
                />
                
                <Select
                  label={t('settings:services.form.currency_label')}
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  options={[
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'CHF', label: 'CHF' }
                  ]}
                />
                
                <Input
                  label={t('settings:services.form.duration_label')}
                  type="number"
                  min="0"
                  step="15"
                  value={formData.durationMinutes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || undefined }))}
                  placeholder={t('settings:services.form.duration_placeholder')}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                onClick={resetForm}
                variant="secondary"
              >
                {t('settings:services.form.cancel_button')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isCreating || isUpdating || !formData.name}
              >
                {(isCreating || isUpdating) ? t('settings:services.form.saving') : t('settings:services.form.save_button')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// Language name mapping
const languageNames: Record<string, string> = {
  // Core Languages
  'de': 'Deutsch',
  'en': 'English',
  // Eastern European Languages
  'ru': 'Русский',
  'pl': 'Polski',
  'cs': 'Čeština',
  'sk': 'Slovenčina',
  'hu': 'Magyar',
  'ro': 'Română',
  'bg': 'български език',
  'sr': 'српски језик',
  'hr': 'Hrvatski',
  'sl': 'Slovenski',
  'bs': 'Bosanski',
  'mk': 'македонски јазик',
  'sq': 'Shqip',
  'lv': 'Latviešu',
  'lt': 'Lietuvių',
  'et': 'Eesti',
  'uk': 'українська',
  'be': 'беларуская',
  // Western & Southern European Languages
  'es': 'Español',
  'it': 'Italiano',
  'fr': 'Français',
  'pt': 'Português',
  'nl': 'Nederlands',
  'el': 'Ελληνικά',
  // Asian Languages
  'th': 'ไทย',
  'tl': 'Filipino',
  'vi': 'Tiếng Việt',
  // Middle Eastern & Other
  'tr': 'Türkçe',
};

// Language Settings Component (NEW - No Backend, uses localStorage + lazy loading)
const LanguageSettings = () => {
  const { t, i18n } = useTranslation('settings');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    typeof window !== 'undefined' ? (localStorage.getItem('preferredLanguage') || 'de') : 'de'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Get available languages from provider
  // ✅ Vollständig übersetzte Sprachen (100% Interface)
  const availableLanguages = [
    { code: 'de', name: 'Deutsch' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'pl', name: 'Polski' },
    { code: 'ru', name: 'Русский' },
    { code: 'cs', name: 'Čeština' },
    { code: 'sk', name: 'Slovenčina' },
    { code: 'hu', name: 'Magyar' },
    { code: 'ro', name: 'Română' },
    // ⚠️ Teilweise übersetzt (nur Language Names, ~5% Interface)
    { code: 'bg', name: 'Български' },
    { code: 'sr', name: 'Српски' },
    { code: 'hr', name: 'Hrvatski' },
    { code: 'sl', name: 'Slovenski' },
    { code: 'bs', name: 'Bosanski' },
    { code: 'pt', name: 'Português' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'th', name: 'ไทย' },
    { code: 'tl', name: 'Filipino' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'tr', name: 'Türkçe' },
  ];

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleSave = () => {
    // Trigger language change in the provider
    console.log(`🌍 Changing language to: ${selectedLanguage}`);
    window.dispatchEvent(new CustomEvent('changeLanguage', { detail: selectedLanguage }));
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const currentLanguageName = languageNames[i18n.language] || 'Deutsch';

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <Alert type="success" message={t('language.change_success')} />
      )}

      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <GlobeAltIcon className="h-6 w-6 text-elysBlue-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">{t('language.title')}</h3>
          </div>
          
          <p className="text-dark-300 text-sm mb-6">
            {t('language.subtitle')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('language.select_language')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {availableLanguages.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => handleLanguageChange(language.code)}
                    className={`p-3 sm:p-4 text-left rounded-lg border-2 transition-all duration-200 relative min-h-[60px] ${
                      selectedLanguage === language.code
                        ? 'border-elysPink-500 bg-gradient-to-r from-elysPink-500/20 to-elysViolet-500/20 text-elysPink-300 shadow-lg shadow-elysPink-500/25 ring-1 ring-elysPink-500/50'
                        : 'border-dark-600 bg-dark-700 text-dark-200 hover:border-dark-500 hover:text-dark-100 hover:bg-dark-600 active:bg-dark-500'
                    }`}
                  >
                    {selectedLanguage === language.code && (
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                        <CheckIcon className="h-4 sm:h-5 w-4 sm:w-5 text-elysPink-400" />
                      </div>
                    )}
                    <div className={`font-medium pr-6 text-sm sm:text-base ${
                      selectedLanguage === language.code ? 'text-elysPink-200' : ''
                    }`}>
                      {language.name}
                    </div>
                    <div className={`text-xs uppercase mt-0.5 sm:mt-1 ${
                      selectedLanguage === language.code ? 'text-elysPink-400' : 'text-dark-400'
                    }`}>
                      {language.code}
                    </div>
                  </button>
                ))}
              </div>
            </div>

              <div className="flex items-center justify-between pt-4 border-t border-dark-600">
              <div className="text-sm text-dark-400">
                {t('language.current_language_prefix')}: {currentLanguageName}
              </div>
              <Button
                onClick={handleSave}
                disabled={selectedLanguage === i18n.language}
                className="flex items-center space-x-2"
              >
                <CheckIcon className="h-4 w-4" />
                <span>{t('common:actions.save')}</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const BotConfigForm = () => {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  
  // Personality tone options with translations
  const personalityToneOptions: { value: PersonalityTone; label: string; description: string }[] = [
    { value: 'professional', label: t('bot_config.personality.tones.professional.label'), description: t('bot_config.personality.tones.professional.description') },
    { value: 'friendly', label: t('bot_config.personality.tones.friendly.label'), description: t('bot_config.personality.tones.friendly.description') },
    { value: 'casual', label: t('bot_config.personality.tones.casual.label'), description: t('bot_config.personality.tones.casual.description') },
    { value: 'flirtatious', label: t('bot_config.personality.tones.flirtatious.label'), description: t('bot_config.personality.tones.flirtatious.description') },
    { value: 'direct', label: t('bot_config.personality.tones.direct.label'), description: t('bot_config.personality.tones.direct.description') },
    { value: 'emotional', label: t('bot_config.personality.tones.emotional.label'), description: t('bot_config.personality.tones.emotional.description') },
    { value: 'warm', label: t('bot_config.personality.tones.warm.label'), description: t('bot_config.personality.tones.warm.description') },
    { value: 'confident', label: t('bot_config.personality.tones.confident.label'), description: t('bot_config.personality.tones.confident.description') },
    { value: 'playful', label: t('bot_config.personality.tones.playful.label'), description: t('bot_config.personality.tones.playful.description') }
  ];
  
  const { data: initialConfig, isLoading, error, refetch } = useFetch(
    () => botApi.getConfig(),
    []
  );

  const { execute: updateConfig, isLoading: isUpdating } = useApi();

  const [activeTab, setActiveTab] = useState<'config' | 'services' | 'settings'>('config');
  const [config, setConfig] = useState<Partial<BotConfig>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load services when config is available
  const { data: servicesData } = useFetch(
    () => config.id ? servicesApi.getAll(config.id) : Promise.resolve({ success: true, data: [] }),
    [config.id]
  );

  // Update config when data loads
  useEffect(() => {
    if (initialConfig?.data) {
      const loaded = initialConfig.data as Partial<BotConfig>;
      const promptText = loaded.generatedSystemPrompt || loaded.systemPrompt || '';
      const extractedBehavior = extractBehaviorSection(promptText);
      const merged = extractedBehavior ? { ...loaded, behaviorGuidelines: extractedBehavior } : loaded;
      // Set default reviewMode and messageReviewMode if not present
      setConfig({ reviewMode: 'never', messageReviewMode: 'never', ...merged });
    }
  }, [initialConfig]);

  // Update services when data loads
  useEffect(() => {
    if (servicesData?.data) {
      setServices(servicesData.data);
    }
  }, [servicesData]);

  // Update generated prompt when config or services change
  useEffect(() => {
    const prompt = generateSystemPrompt(config, services);
    setGeneratedPrompt(prompt);
  }, [config, services]);

  const handleInputChange = (field: keyof BotConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const configWithPrompt = {
        ...config,
        generatedSystemPrompt: generatedPrompt,
        systemPrompt: generatedPrompt // Update legacy field too
      };
      
      await updateConfig(() => botApi.updateConfig(configWithPrompt));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetch();
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t('settings:bot_config.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" message={`${t('settings:bot_config.error_loading')} ${error}`} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`py-3 px-1 border-b-2 font-medium text-sm min-h-[44px] ${
              activeTab === 'config'
                ? 'border-elysPink-500 text-elysPink-500'
                : 'border-transparent text-dark-300 hover:text-dark-200 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <CogIcon className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-xs sm:text-sm">{t('tabs.bot_config')}</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`py-3 px-1 border-b-2 font-medium text-sm min-h-[44px] ${
              activeTab === 'services'
                ? 'border-elysPink-500 text-elysPink-500'
                : 'border-transparent text-dark-300 hover:text-dark-200 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <CurrencyEuroIcon className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-xs sm:text-sm">{t('tabs.services')}</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-1 border-b-2 font-medium text-sm min-h-[44px] ${
              activeTab === 'settings'
                ? 'border-elysPink-500 text-elysPink-500'
                : 'border-transparent text-dark-300 hover:text-dark-200 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <CogIcon className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="text-xs sm:text-sm">{t('tabs.settings')}</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'config' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {saveSuccess && (
            <Alert type="success" message={t('messages.config_saved')} />
          )}

      {/* Bot Identity Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <UserIcon className="h-6 w-6 text-elysViolet-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">{t('bot_config.identity.title')}</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Input
              label={t('bot_config.identity.name_label')}
              value={config.botName || ''}
              onChange={(e) => handleInputChange('botName', e.target.value)}
              placeholder="z.B. Dr. Schmidt's Assistent"
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('bot_config.identity.description_label')}
              </label>
              <Textarea
                value={config.botDescription || ''}
                onChange={(e) => handleInputChange('botDescription', e.target.value)}
                placeholder="Kurze Beschreibung was der Bot tut und ist..."
                rows={3}
                required
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Personality Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-elysViolet-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">{t('bot_config.personality.title')}</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('bot_config.personality.tone_label')}
              </label>
              <Select
                value={config.personalityTone || 'friendly'}
                onChange={(e) => handleInputChange('personalityTone', e.target.value as PersonalityTone)}
                options={personalityToneOptions.map(option => ({
                  value: option.value,
                  label: `${option.label} - ${option.description}`
                }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('bot_config.personality.traits_label')}
              </label>
              <Textarea
                value={config.characterTraits || ''}
                onChange={(e) => handleInputChange('characterTraits', e.target.value)}
                placeholder={t('bot_config.personality.traits_placeholder')}
                rows={2}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Background & Services Section - removed as requested */}

      {/* Rules & Limitations Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <SparklesIcon className="h-6 w-6 text-elysPink-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">{t('bot_config.rules.title')}</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('bot_config.rules.escalation_label')}
              </label>
              <Textarea
                value={config.escalationRules || ''}
                onChange={(e) => handleInputChange('escalationRules', e.target.value)}
                placeholder={t('bot_config.rules.escalation_placeholder')}
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('bot_config.rules.limitations_label')}
              </label>
              <Textarea
                value={config.botLimitations || ''}
                onChange={(e) => handleInputChange('botLimitations', e.target.value)}
                placeholder={t('bot_config.rules.limitations_placeholder')}
                rows={3}
              />
            </div>

          </div>
        </div>
      </Card>

      {/* Review Settings Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-6 w-6 text-elysPink-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">{t('bot_config.review_settings.title')}</h3>
          </div>
          
          <p className="text-sm text-dark-300 mb-6">
            {t('bot_config.review_settings.description')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-3">
                {t('bot_config.review_settings.mode_label')}
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('reviewMode', 'never')}
                  className={`
                    p-4 border-2 rounded-lg text-left transition-all
                    ${config.reviewMode === 'never' 
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-dark-700 hover:border-dark-600'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckIcon className={`w-5 h-5 ${config.reviewMode === 'never' ? 'text-blue-600' : 'text-dark-400'}`} />
                    <span className="font-semibold text-dark-50">{t('bot_config.review_settings.modes.never.label')}</span>
                  </div>
                  <p className="text-xs text-dark-300">
                    {t('bot_config.review_settings.modes.never.description')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('reviewMode', 'on_redflag')}
                  className={`
                    p-4 border-2 rounded-lg text-left transition-all
                    ${config.reviewMode === 'on_redflag' 
                      ? 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'border-dark-700 hover:border-dark-600'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`text-lg ${config.reviewMode === 'on_redflag' ? '' : 'opacity-50'}`}>🚩</span>
                    <span className="font-semibold text-dark-50">{t('bot_config.review_settings.modes.redflag.label')}</span>
                  </div>
                  <p className="text-xs text-dark-300">
                    {t('bot_config.review_settings.modes.redflag.description')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('reviewMode', 'always')}
                  className={`
                    p-4 border-2 rounded-lg text-left transition-all
                    ${config.reviewMode === 'always' 
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-dark-700 hover:border-dark-600'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <ClockIcon className={`w-5 h-5 ${config.reviewMode === 'always' ? 'text-purple-600' : 'text-dark-400'}`} />
                    <span className="font-semibold text-dark-50">{t('bot_config.review_settings.modes.always.label')}</span>
                  </div>
                  <p className="text-xs text-dark-300">
                    {t('bot_config.review_settings.modes.always.description')}
                  </p>
                </button>
              </div>
            </div>

            {/* Info Box basierend auf ausgewähltem Modus */}
            {config.reviewMode === 'always' && (
              <Alert 
                type="info" 
                message={t('bot_config.review_settings.modes.always.alert')}
              />
            )}
            {config.reviewMode === 'on_redflag' && (
              <Alert 
                type="warning" 
                message={t('bot_config.review_settings.modes.redflag.alert')}
              />
            )}
            {config.reviewMode === 'never' && (
              <Alert 
                type="success" 
                message={t('bot_config.review_settings.modes.never.alert')}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Message Review Settings Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-6 w-6 text-elysPink-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">{t('bot_config.message_review.title')}</h3>
          </div>
          
          <p className="text-sm text-dark-300 mb-6">
            {t('bot_config.message_review.description')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-3">
                {t('bot_config.message_review.mode_label')}
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('messageReviewMode', 'never')}
                  className={`
                    p-4 border-2 rounded-lg text-left transition-all
                    ${config.messageReviewMode === 'never' 
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-dark-700 hover:border-dark-600'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckIcon className={`w-5 h-5 ${config.messageReviewMode === 'never' ? 'text-blue-600' : 'text-dark-400'}`} />
                    <span className="font-semibold text-dark-50">{t('bot_config.message_review.modes.never.label')}</span>
                  </div>
                  <p className="text-xs text-dark-300">
                    {t('bot_config.message_review.modes.never.description')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('messageReviewMode', 'on_redflag')}
                  className={`
                    p-4 border-2 rounded-lg text-left transition-all
                    ${config.messageReviewMode === 'on_redflag' 
                      ? 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'border-dark-700 hover:border-dark-600'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`text-lg ${config.messageReviewMode === 'on_redflag' ? '' : 'opacity-50'}`}>🚩</span>
                    <span className="font-semibold text-dark-50">{t('bot_config.message_review.modes.redflag.label')}</span>
                  </div>
                  <p className="text-xs text-dark-300">
                    {t('bot_config.message_review.modes.redflag.description')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('messageReviewMode', 'always')}
                  className={`
                    p-4 border-2 rounded-lg text-left transition-all
                    ${config.messageReviewMode === 'always' 
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-dark-700 hover:border-dark-600'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <ClockIcon className={`w-5 h-5 ${config.messageReviewMode === 'always' ? 'text-purple-600' : 'text-dark-400'}`} />
                    <span className="font-semibold text-dark-50">{t('bot_config.message_review.modes.always.label')}</span>
                  </div>
                  <p className="text-xs text-dark-300">
                    {t('bot_config.message_review.modes.always.description')}
                  </p>
                </button>
              </div>
            </div>

            {/* Info Box basierend auf ausgewähltem Modus */}
            {config.messageReviewMode === 'always' && (
              <Alert 
                type="info" 
                message={t('bot_config.message_review.modes.always.alert')}
              />
            )}
            {config.messageReviewMode === 'on_redflag' && (
              <Alert 
                type="warning" 
                message={t('bot_config.message_review.modes.redflag.alert')}
              />
            )}
            {config.messageReviewMode === 'never' && (
              <Alert 
                type="success" 
                message={t('bot_config.message_review.modes.never.alert')}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Behavior Section - moved to its own bottom container */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <SparklesIcon className="h-6 w-6 text-elysViolet-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">{t('bot_config.behavior.title')}</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('bot_config.behavior.label')}
              </label>
              <Textarea
                value={config.behaviorGuidelines ?? DEFAULT_BEHAVIOR_GUIDELINES}
                onChange={(e) => handleInputChange('behaviorGuidelines', e.target.value)}
                placeholder={t('bot_config.behavior.placeholder')}
                rows={8}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* System Prompt Preview */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-50">{t('bot_config.behavior.preview_title')}</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? t('bot_config.behavior.hide_preview') : t('bot_config.behavior.show_preview')}
            </Button>
          </div>
          
          {showPreview && (
            <div className="bg-dark-600 p-4 rounded-lg border border-dark-500">
              <pre className="whitespace-pre-wrap text-sm text-dark-200 font-mono">
                {generatedPrompt}
              </pre>
            </div>
          )}
        </div>
      </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isUpdating}
              className="min-w-[200px]"
            >
              {isUpdating ? t('bot_config.saving') : t('bot_config.save_button')}
            </Button>
          </div>
        </form>
      ) : activeTab === 'services' ? (
        config.id ? (
          <ServicesManagement 
            botConfigId={config.id} 
            onServicesChange={setServices}
          />
        ) : (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">{t('messages.loading_config')}</span>
          </div>
        )
      ) : (
        <LanguageSettings />
      )}
    </div>
  );
};

export default BotConfigForm; 