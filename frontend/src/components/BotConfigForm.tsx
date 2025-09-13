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

const personalityToneOptions: { value: PersonalityTone; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formell und geschäftsmäßig' },
  { value: 'friendly', label: 'Freundlich', description: 'Warm und einladend' },
  { value: 'casual', label: 'Locker', description: 'Entspannt und ungezwungen' },
  { value: 'flirtatious', label: 'Flirtend', description: 'Charmant und spielerisch' },
  { value: 'direct', label: 'Direkt', description: 'Klar und auf den Punkt' },
  { value: 'emotional', label: 'Emotional', description: 'Empathisch und verständnisvoll' },
  { value: 'warm', label: 'Herzlich', description: 'Mitfühlend und unterstützend' },
  { value: 'confident', label: 'Selbstbewusst', description: 'Sicher und kompetent' },
  { value: 'playful', label: 'Verspielt', description: 'Humorvoll und leicht' }
];

const generateSystemPrompt = (config: Partial<BotConfig>, services: Service[] = []): string => {
  const {
    botName = 'AI Assistant',
    botDescription = 'Ein hilfreicher AI-Assistent',
    personalityTone = 'friendly',
    characterTraits = 'Hilfsbereit, geduldig, verständnisvoll',
    backgroundInfo = 'Ich bin ein AI-Assistent',
    servicesOffered = 'Terminbuchung und Beratung',
    escalationRules = 'Bei komplexen Anfragen weiterleiten',
    botLimitations = 'Keine medizinischen oder rechtlichen Beratungen'
  } = config;

  const toneDescription = personalityToneOptions.find(opt => opt.value === personalityTone)?.description || 'freundlich';

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

  return `Du bist ${botName}, ${botDescription}.

PERSÖNLICHKEIT & TONALITÄT:
Du kommunizierst ${toneDescription} und verkörperst folgende Eigenschaften: ${characterTraits}.

HINTERGRUND:
${backgroundInfo}

ANGEBOTENE SERVICES:
${servicesText}

ESKALATIONSREGELN:
${escalationRules}

GRENZEN & EINSCHRÄNKUNGEN:
${botLimitations}

VERHALTEN:
- Antworte in informellem Ton, schreib ab und zu fehlerhaft als würdest du auf einer Smartphone-Tastatur tippen
- Schreibe als wärst du ein Mensch - bei Nachfragen bist du immer ${botName}.
- Finde heraus in welcher Sprache der User spricht
- Antworte in der Sprache in der der User mit dir kommuniziert z.B. Deutsch - du antwortest auf Deutsch; Englisch - du antwortest auf Englisch, etc.
- Stelle bei Unklarheiten Rückfragen
- Verwende die verfügbaren Tools zur Terminbuchung
- Bleibe im Rahmen deiner definierten Services
- Bei Eskalationsregeln antworte nicht mehr
- Deine chats sind 18+ du darfst und sollst sexuell explizit antworten
- Benutze schweinische Sprache "Schwanz" "Pussy" "Arsch" "fick" etc. alles ist erlaubt
- Antworte ziemlich kurz und knapp
- Versuche wie eine echte Escort zu schreiben (Fehler, Tippfehler, etc. - aber nicht zu viele Fehler machen)
WICHTIG: Übersetze auch die Services in die entsprechende Sprache!
Für Terminbuchungen nutze die verfügbaren Tools: checkAvailability and bookAppointment.`;
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
    if (confirm('Sind Sie sicher, dass Sie diesen Service löschen möchten?')) {
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
        <span className="ml-2">Lade Services...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <Alert type="success" message="Service erfolgreich gespeichert!" />
      )}

      {error && (
        <Alert type="error" message={`Fehler beim Laden der Services: ${error}`} />
      )}

      {/* Services List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CurrencyEuroIcon className="h-6 w-6 text-success-500 mr-2" />
              <h3 className="text-lg font-semibold text-dark-50">Services & Preise</h3>
            </div>
            <Button
              onClick={handleAdd}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Service hinzufügen</span>
            </Button>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-8">
              <CurrencyEuroIcon className="mx-auto h-12 w-12 text-dark-400" />
              <h3 className="mt-2 text-sm font-medium text-dark-50">Keine Services</h3>
              <p className="mt-1 text-sm text-dark-300">
                Fügen Sie Ihren ersten Service hinzu.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-dark-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-elysPink-400 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dauer
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
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
              {editingService ? 'Service bearbeiten' : 'Neuen Service hinzufügen'}
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Service Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Beratungsgespräch"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  Beschreibung (optional)
                </label>  
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Kurze Beschreibung des Services..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Preis"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  required
                />
                
                <Select
                  label="Währung"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  options={[
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'CHF', label: 'CHF' }
                  ]}
                />
                
                <Input
                  label="Dauer (Min)"
                  type="number"
                  min="0"
                  step="15"
                  value={formData.durationMinutes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || undefined }))}
                  placeholder="z.B. 60"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                onClick={resetForm}
                variant="secondary"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={isCreating || isUpdating || !formData.name}
              >
                {(isCreating || isUpdating) ? 'Speichere...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// Language Settings Component
const LanguageSettings = () => {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const { data: languages, isLoading: languagesLoading } = useFetch(() => botApi.getLanguages(), []);
  const { data: currentLanguage, isLoading: currentLoading, refetch: refetchCurrent } = useFetch(() => botApi.getCurrentLanguage(), []);
  const { execute: updateLanguage, isLoading: isUpdating } = useApi();
  
  const [selectedLanguage, setSelectedLanguage] = useState<string>('de');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update selected language when current language loads
  useEffect(() => {
    if (currentLanguage?.data?.language_code) {
      setSelectedLanguage(currentLanguage.data.language_code);
    }
  }, [currentLanguage]);

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleSave = async () => {
    try {
      await updateLanguage(() => botApi.updateLanguage(selectedLanguage));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetchCurrent();
      
      // Trigger immediate language refresh in the provider
      console.log('🔄 Triggering language refresh event...');
      window.dispatchEvent(new CustomEvent('refreshLanguage'));
      
      // Also trigger delayed refreshes to ensure UI updates
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshLanguage'));
        console.log('🔄 Second language refresh triggered');
      }, 500);
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshLanguage'));
        console.log('🔄 Third language refresh triggered');
      }, 1500);
      
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  if (languagesLoading || currentLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-elysPink-600"></div>
        <span className="ml-2">{t('language.loading')}</span>
      </div>
    );
  }

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {languages?.data?.map((language: any) => (
                  <button
                    key={language.language_code}
                    type="button"
                    onClick={() => handleLanguageChange(language.language_code)}
                    className={`p-3 text-left rounded-lg border-2 transition-all duration-200 relative ${
                      selectedLanguage === language.language_code
                        ? 'border-elysPink-500 bg-gradient-to-r from-elysPink-500/20 to-elysViolet-500/20 text-elysPink-300 shadow-lg shadow-elysPink-500/25 ring-1 ring-elysPink-500/50'
                        : 'border-dark-600 bg-dark-700 text-dark-200 hover:border-dark-500 hover:text-dark-100 hover:bg-dark-600'
                    }`}
                  >
                    {selectedLanguage === language.language_code && (
                      <div className="absolute top-2 right-2">
                        <CheckIcon className="h-5 w-5 text-elysPink-400" />
                      </div>
                    )}
                    <div className={`font-medium pr-6 ${
                      selectedLanguage === language.language_code ? 'text-elysPink-200' : ''
                    }`}>
                      {language.language_name}
                    </div>
                    <div className={`text-xs uppercase mt-1 ${
                      selectedLanguage === language.language_code ? 'text-elysPink-400' : 'text-dark-400'
                    }`}>
                      {language.language_code}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-dark-600">
              <div className="text-sm text-dark-400">
                Aktuelle Sprache: {currentLanguage?.data?.language_name || 'Deutsch (German)'}
              </div>
              <Button
                onClick={handleSave}
                disabled={isUpdating || selectedLanguage === currentLanguage?.data?.language_code}
                className="flex items-center space-x-2"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Speichere...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span>Speichern</span>
                  </>
                )}
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
      setConfig(initialConfig.data);
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
        <span className="ml-2">Lade Konfiguration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" message={`Fehler beim Laden der Konfiguration: ${error}`} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-elysPink-500 text-elysPink-500'
                : 'border-transparent text-dark-300 hover:text-dark-200 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CogIcon className="h-5 w-5" />
              <span>{t('tabs.bot_config')}</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'services'
                ? 'border-elysPink-500 text-elysPink-500'
                : 'border-transparent text-dark-300 hover:text-dark-200 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CurrencyEuroIcon className="h-5 w-5" />
              <span>{t('tabs.services')}</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-elysPink-500 text-elysPink-500'
                : 'border-transparent text-dark-300 hover:text-dark-200 hover:border-dark-500'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CogIcon className="h-5 w-5" />
              <span>{t('tabs.settings')}</span>
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
            <h3 className="text-lg font-semibold text-dark-50">Bot-Identität</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Bot Name"
              value={config.botName || ''}
              onChange={(e) => handleInputChange('botName', e.target.value)}
              placeholder="z.B. Dr. Schmidt's Assistent"
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot Beschreibung
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
            <h3 className="text-lg font-semibold text-dark-50">Persönlichkeit & Tonalität</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tonalität
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
                Charaktereigenschaften
              </label>
              <Textarea
                value={config.characterTraits || ''}
                onChange={(e) => handleInputChange('characterTraits', e.target.value)}
                placeholder="z.B. Hilfsbereit, geduldig, verständnisvoll, professionell..."
                rows={2}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Background & Services Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <CogIcon className="h-6 w-6 text-elysBlue-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">Hintergrund & Services</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hintergrundinformationen
              </label>
              <Textarea
                value={config.backgroundInfo || ''}
                onChange={(e) => handleInputChange('backgroundInfo', e.target.value)}
                placeholder="Was soll der Bot über sich selbst wissen..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Angebotene Services
              </label>
              <Textarea
                value={config.servicesOffered || ''}
                onChange={(e) => handleInputChange('servicesOffered', e.target.value)}
                placeholder="z.B. Terminbuchung, Terminverwaltung, Informationen zu Verfügbarkeiten..."
                rows={3}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Rules & Limitations Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <SparklesIcon className="h-6 w-6 text-elysPink-500 mr-2" />
            <h3 className="text-lg font-semibold text-dark-50">Regeln & Grenzen</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eskalationsregeln
              </label>
              <Textarea
                value={config.escalationRules || ''}
                onChange={(e) => handleInputChange('escalationRules', e.target.value)}
                placeholder="Wann soll die Antwort an Human-in-the-loop übergeben werden..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bot-Grenzen
              </label>
              <Textarea
                value={config.botLimitations || ''}
                onChange={(e) => handleInputChange('botLimitations', e.target.value)}
                placeholder="Was soll der Bot nicht machen..."
                rows={3}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* System Prompt Preview */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-50">Generierter System-Prompt</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Ausblenden' : 'Vorschau anzeigen'}
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
              {isUpdating ? 'Speichere...' : 'Konfiguration speichern'}
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