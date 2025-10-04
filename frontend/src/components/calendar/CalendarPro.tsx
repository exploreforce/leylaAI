'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFetch, useApi } from '@/hooks/useApi';
import { appointmentsApi, botApi, servicesApi, calendarApi } from '@/utils/api';
import moment from 'moment';
import { Appointment, Service, ApiResponse } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { 
  ArrowDownTrayIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  CalendarIcon,

  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  ExclamationCircleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';

// Declare global DayPilot
declare global {
  interface Window {
    DayPilot: any;
  }
}

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

const weekDays = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },  
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' }
];

interface CalendarProProps {
  className?: string;
}

const AvailabilitySettings = () => {
  const { execute: updateAvailability, isLoading: isUpdating } = useApi();
  
  const [schedule, setSchedule] = useState<{ [key: string]: DaySchedule }>({
    monday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
    tuesday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
    wednesday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
    thursday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
    friday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
    saturday: { isAvailable: false, timeSlots: [] },
    sunday: { isAvailable: false, timeSlots: [] }
  });

  const [blackoutDates, setBlackoutDates] = useState<Array<{ date: string; reason: string }>>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing availability configuration
  useEffect(() => {
    const loadAvailabilityConfig = async () => {
      try {
        // Create/ensure default config exists
        const configResponse = await fetch('/api/bot/debug/availability-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.config && configData.config.weeklySchedule) {
            console.log('📅 Loaded availability config:', configData.config);
            
            // Transform backend format to frontend format
            const backendSchedule = configData.config.weeklySchedule;
            const frontendSchedule: { [key: string]: DaySchedule } = {};
            
            Object.keys(backendSchedule).forEach(day => {
              const dayConfig = backendSchedule[day];
              frontendSchedule[day] = {
                isAvailable: dayConfig.isAvailable || false,
                timeSlots: dayConfig.timeSlots || []
              };
            });
            
            setSchedule(frontendSchedule);
          }
        }
      } catch (error) {
        console.error('Failed to load availability config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailabilityConfig();
  }, []);

  const updateDayAvailability = (day: string, isAvailable: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isAvailable,
        timeSlots: isAvailable ? prev[day].timeSlots : []
      }
    }));
  };

  const addTimeSlot = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [...prev[day].timeSlots, { start: '09:00', end: '17:00' }]
      }
    }));
  };

  const updateTimeSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot, i) => 
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const removeTimeSlot = (day: string, index: number) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((_, i) => i !== index)
      }
    }));
  };

  const addBlackoutDate = () => {
    setBlackoutDates(prev => [...prev, { date: moment().format('YYYY-MM-DD'), reason: '' }]);
  };

  const updateBlackoutDate = (index: number, field: 'date' | 'reason', value: string) => {
    setBlackoutDates(prev => prev.map((bd, i) => 
      i === index ? { ...bd, [field]: value } : bd
    ));
  };

  const removeBlackoutDate = (index: number) => {
    setBlackoutDates(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      // Transform frontend format to backend format
      const backendSchedule: { [key: string]: any } = {};
      
      Object.keys(schedule).forEach(day => {
        const dayConfig = schedule[day];
        
        // Map day names to dayOfWeek numbers (0 = Sunday, 1 = Monday, etc.)
        const dayOfWeekMap: { [key: string]: number } = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6
        };
        
        backendSchedule[day] = {
          dayOfWeek: dayOfWeekMap[day] || 0,
          isAvailable: dayConfig.isAvailable,
          timeSlots: dayConfig.timeSlots
        };
      });

      console.log('💾 Saving availability config:', backendSchedule);

      await updateAvailability(() => calendarApi.updateAvailability({
        weeklySchedule: backendSchedule,
        blackoutDates: blackoutDates.map(bd => ({
          date: bd.date,
          reason: bd.reason,
          isRecurring: false
        }))
      }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      console.log('✅ Availability configuration saved successfully');
    } catch (error) {
      console.error('❌ Failed to save availability:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Lade Verfügbarkeiten...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Schedule */}
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex items-center mb-4 sm:mb-6">
            <ClockIcon className="h-5 sm:h-6 w-5 sm:w-6 text-elysViolet-500 mr-2" />
            <h3 className="text-base sm:text-lg font-semibold text-dark-50">Wöchentliche Verfügbarkeit</h3>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {weekDays.map(({ key, label }) => (
              <div key={key} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedule[key]?.isAvailable || false}
                      onChange={(e) => updateDayAvailability(key, e.target.checked)}
                      className="h-5 w-5 text-elysViolet-500 focus:ring-elysViolet-500 border-gray-300 rounded cursor-pointer"
                    />
                    <span className="ml-3 text-sm font-medium text-dark-100">
                      {label}
                    </span>
                  </label>
                </div>

                {schedule[key]?.isAvailable && (
                  <div className="space-y-3">
                    {schedule[key].timeSlots.map((slot, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(key, index, 'start', e.target.value)}
                            className="flex-1 sm:w-32 min-h-[44px]"
                          />
                          <span className="text-dark-300 text-sm flex-shrink-0">bis</span>
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(key, index, 'end', e.target.value)}
                            className="flex-1 sm:w-32 min-h-[44px]"
                          />
                        </div>
                        <Button
                          onClick={() => removeTimeSlot(key, index)}
                          variant="secondary"
                          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={() => addTimeSlot(key)}
                      variant="secondary"
                      className="flex items-center justify-center space-x-2 text-sm w-full sm:w-auto min-h-[44px] px-4"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Zeitfenster hinzufügen</span>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Blackout Dates */}
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div className="flex items-center">
              <CalendarIcon className="h-5 sm:h-6 w-5 sm:w-6 text-elysPink-500 mr-2" />
              <h3 className="text-base sm:text-lg font-semibold text-dark-50">Gesperrte Termine</h3>
            </div>
            <Button
              onClick={addBlackoutDate}
              className="flex items-center justify-center space-x-2 min-h-[44px] w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Datum hinzufügen</span>
            </Button>
          </div>
          
          <div className="space-y-3">
            {blackoutDates.length === 0 ? (
              <p className="text-dark-300 text-center py-4 text-sm">Keine gesperrten Termine</p>
            ) : (
              blackoutDates.map((blackout, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Input
                    type="date"
                    value={blackout.date}
                    onChange={(e) => updateBlackoutDate(index, 'date', e.target.value)}
                    className="flex-1 min-h-[44px]"
                  />
                  <Input
                    placeholder="Grund (optional)"
                    value={blackout.reason}
                    onChange={(e) => updateBlackoutDate(index, 'reason', e.target.value)}
                    className="flex-1 sm:flex-2 min-h-[44px]"
                  />
                  <Button
                    onClick={() => removeBlackoutDate(index)}
                    variant="secondary"
                    className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-success-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-success-600 font-medium">Verfügbarkeiten erfolgreich gespeichert!</span>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isUpdating}
          className="min-w-[200px] w-full sm:w-auto min-h-[44px]"
        >
          {isUpdating ? 'Speichere...' : 'Verfügbarkeiten speichern'}
        </Button>
      </div>
    </div>
  );
};

// Helper function to format datetime safely
const formatDateTime = (datetime: string | Date) => {
  try {
    let dateObj: Date;
    
    if (typeof datetime === 'string') {
      // Handle different string formats
      if (datetime.includes('T')) {
        // ISO format: "2025-08-12T11:00:00.000Z" or "2025-08-12T11:00:00"
        dateObj = new Date(datetime.replace('Z', ''));
      } else {
        // Local format: "2025-08-12 11:00" -> "2025-08-12T11:00"
        dateObj = new Date(datetime.replace(' ', 'T'));
      }
    } else {
      dateObj = new Date(datetime);
    }
    
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️ Invalid datetime:', datetime);
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('❌ Error formatting datetime:', datetime, error);
    return 'Invalid Date';
  }
};

const CalendarPro: React.FC<CalendarProProps> = ({ className = '' }) => {
  const [view, setView] = useState<'Month' | 'Week' | 'Day' | 'Availability'>('Week');
  const [zoomLevel, setZoomLevel] = useState<'compact' | 'normal' | 'spacious'>('compact');
  const [startDate, setStartDate] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [calendar, setCalendar] = useState<any>(null);
  // const [navigator, setNavigator] = useState<any>(null); // Removed Navigator
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [availabilityConfig, setAvailabilityConfig] = useState<any>(null);
  
  const calendarRef = useRef<HTMLDivElement>(null);
  // const navigatorRef = useRef<HTMLDivElement>(null); // Removed Navigator
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  // Modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('view');
  const [selectedSlot, setSelectedSlot] = useState<{start: any, end: any} | null>(null);

  // API hooks
  const { execute: createAppointment, isLoading: isCreating } = useApi();
  const { execute: updateAppointment, isLoading: isUpdating } = useApi();
  const { execute: deleteAppointment, isLoading: isDeleting } = useApi();

  // Load DayPilot scripts
  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    const loadAllScripts = async () => {
      try {
        await loadScript('/daypilot/daypilot-all.min.js');
        // await loadScript('/daypilot/daypilot-navigator.min.js'); // Removed Navigator
        await loadScript('/daypilot/daypilot-modal.min.js');
        await loadScript('/daypilot/daypilot-datepicker.min.js');
        await loadScript('/daypilot/daypilot-scheduler.min.js');
        
        setIsScriptLoaded(true);
        setStartDate(window.DayPilot.Date.today());
      } catch (error) {
        console.error('Error loading DayPilot scripts:', error);
      }
    };

    loadAllScripts();
  }, []);

  // Fetch appointments and services
  const { data: appointmentsData, refetch: refetchAppointments } = useFetch<ApiResponse<Appointment[]>>(
    () => {
      if (!startDate) {
        console.log('🔍 No startDate - returning empty appointments');
        return Promise.resolve({ success: true, data: [] as Appointment[] });
      }
      
      // For Month view: load entire month
      // For Week/Day view: load a wider range to include appointments in adjacent months
      let startDateStr: string;
      let endDateStr: string;
      
      if (view === 'Month') {
        // Month view: load only the current month
        startDateStr = startDate.firstDayOfMonth().toString('yyyy-MM-dd');
        endDateStr = startDate.lastDayOfMonth().toString('yyyy-MM-dd');
      } else if (view === 'Week') {
        // Week view: load from start of week to end of week (including adjacent months)
        const weekStart = startDate.firstDayOfWeek(1); // 1 = Monday
        const weekEnd = weekStart.addDays(6);
        startDateStr = weekStart.toString('yyyy-MM-dd');
        endDateStr = weekEnd.toString('yyyy-MM-dd');
      } else {
        // Day view: load just the current day (but add some buffer for context)
        startDateStr = startDate.toString('yyyy-MM-dd');
        endDateStr = startDate.toString('yyyy-MM-dd');
      }
      
      console.log('🔍 Fetching appointments for date range:', {
        view: view,
        startDate: startDateStr,
        endDate: endDateStr,
        currentDisplay: view === 'Month' ? startDate.toString('MMMM yyyy') : 
                       view === 'Week' ? `Week of ${startDate.toString('MMM dd, yyyy')}` :
                       startDate.toString('MMM dd, yyyy')
      });
      
      return appointmentsApi.getAll({
        startDate: startDateStr,
        endDate: endDateStr,
      });
    },
    [startDate, view]
  );

  const { data: botConfig, isLoading: botConfigLoading, error: botConfigError } = useFetch(() => botApi.getConfig(), []);
  
  // Debug botConfig loading
  useEffect(() => {
    console.log('🔍 CalendarPro: BotConfig loading state:');
    console.log('  - isLoading:', botConfigLoading);
    console.log('  - error:', botConfigError);
    console.log('  - botConfig:', botConfig);
    console.log('  - hasId:', !!botConfig?.data?.id);
    console.log('  - botConfig.data.id:', botConfig?.data?.id);
  }, [botConfig, botConfigLoading, botConfigError]);

  // Fetch services
  useEffect(() => {
    console.log('🚀 SERVICES USEEFFECT TRIGGERED!');
    console.log('🔍 CalendarPro: Bot config loaded:', botConfig);
    console.log('🔍 CalendarPro: botConfig?.data?.id exists?', !!botConfig?.data?.id);
    console.log('🔍 CalendarPro: botConfig?.data?.id value:', botConfig?.data?.id);
    
    if (botConfig?.data?.id) {
      console.log('🔍 CalendarPro: Fetching services for botConfig.data.id:', botConfig.data.id);
      console.log('🔍 CalendarPro: About to call servicesApi.getAll...');
      
      servicesApi.getAll(botConfig.data.id)
        .then(response => {
          console.log('🔍 CalendarPro: Services API response:', response);
          console.log('🔍 CalendarPro: Response type:', typeof response);
          console.log('🔍 CalendarPro: Response success:', response?.success);
          console.log('🔍 CalendarPro: Response data:', response?.data);
          
          if (response && response.success && Array.isArray(response.data)) {
            console.log('✅ CalendarPro: Services loaded successfully:', response.data);
            console.log('✅ CalendarPro: Services count:', response.data.length);
            setServices(response.data);
          } else {
            console.warn('⚠️ CalendarPro: Services response invalid:', response);
            console.warn('⚠️ CalendarPro: Setting empty services array');
            setServices([]); // Set empty array as fallback
          }
        })
        .catch(error => {
          console.error('❌ CalendarPro: Error loading services:', error);
          console.error('❌ CalendarPro: Error details:', error?.message || 'Unknown error');
          console.error('❌ CalendarPro: Setting empty services array');
          setServices([]); // Set empty array as fallback
        });
    } else {
      console.warn('⚠️ CalendarPro: Bot config ID not available');
      console.warn('⚠️ CalendarPro: BotConfig:', botConfig);
      console.warn('⚠️ CalendarPro: Setting empty services array due to no bot config ID');
      setServices([]);
    }
  }, [botConfig?.data?.id]);
  
  // Load availability configuration for calendar display
  useEffect(() => {
    const loadAvailabilityForCalendar = async () => {
      try {
        const configResponse = await fetch('/api/bot/debug/availability-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.config && configData.config.weeklySchedule) {
            console.log('📅 Loaded availability config for calendar:', configData.config);
            setAvailabilityConfig(configData.config.weeklySchedule);
          }
        }
      } catch (error) {
        console.error('Failed to load availability config for calendar:', error);
      }
    };

    loadAvailabilityForCalendar();
  }, []);

  // Transform appointments to DayPilot events format
  useEffect(() => {
    console.log('🔄 appointmentsData changed:', {
      success: appointmentsData?.success,
      dataLength: appointmentsData?.data?.length || 0,
      data: appointmentsData?.data
    });
    
    if (appointmentsData?.data && window.DayPilot) {
      console.log('🔄 Processing', appointmentsData.data.length, 'appointments for calendar display');
      
      // Show all appointments including cancelled and no-show (they will be styled in red)
      const visibleAppointments = appointmentsData.data;
      
      const dayPilotEvents = visibleAppointments.map((appointment: Appointment) => {
        console.log('🔄 Processing appointment:', {
          id: appointment.id,
          customerName: appointment.customerName,
          datetime: appointment.datetime,
          status: appointment.status,
          appointmentType: appointment.appointmentType
        });
        
        // Convert local datetime string to DayPilot Date (NO TIMEZONE CONVERSION)
        let appointmentStart;
        let appointmentEnd;
        
        try {
          // Normalize to strict ISO local string 'YYYY-MM-DDTHH:mm:ss'
          const raw = String(appointment.datetime || '');
          let isoLocal = raw.includes('T') ? raw.replace('Z', '') : raw.replace(' ', 'T');
          if (isoLocal.length === 16) {
            isoLocal = isoLocal + ':00';
          }
          // Validate minimal length 'YYYY-MM-DDTHH:mm:ss' = 19
          if (isoLocal.length < 19) {
            throw new Error(`Invalid datetime format: ${raw}`);
          }

          appointmentStart = new window.DayPilot.Date(isoLocal);
          appointmentEnd = new window.DayPilot.Date(isoLocal).addMinutes(appointment.duration);
        } catch (error) {
          console.warn('⚠️ Error parsing appointment datetime:', appointment.datetime, error);
          // Fallback to current time
          appointmentStart = window.DayPilot.Date.today();
          appointmentEnd = appointmentStart.addMinutes(appointment.duration || 60);
        }

        const event = {
          id: appointment.id,
          text: `${appointment.customerName}`,
          start: appointmentStart,
          end: appointmentEnd,
          data: appointment, // Store full appointment data for access
          // Event styling will be handled by onBeforeEventRender
          tags: {
            status: appointment.status,
            serviceType: appointment.serviceName || appointment.appointmentType || 'Service',
            duration: appointment.duration,
            priority: getDurationPriority(appointment.duration)
          }
        };
        
        console.log('🔄 Created DayPilot event:', {
          id: event.id,
          text: event.text,
          start: event.start.toString(),
          end: event.end.toString()
        });
        return event;
      });
      
      console.log('✅ All DayPilot events created:', dayPilotEvents);
      setEvents(dayPilotEvents);
    } else {
      console.log('⚠️ No appointment data or DayPilot not loaded:', {
        hasData: !!appointmentsData?.data,
        dataLength: appointmentsData?.data?.length || 0,
        hasDayPilot: !!window.DayPilot
      });
      setEvents([]);
    }
  }, [appointmentsData]);

  // Initialize calendar when script is loaded
  useEffect(() => {
    if (isScriptLoaded && calendarRef.current && startDate) {
      initializeCalendar();
    }
  }, [isScriptLoaded, view, startDate, zoomLevel, events, availabilityConfig]);

  // Update events when they change
  useEffect(() => {
    if (calendar && events.length >= 0) {
      calendar.events.list = events;
      calendar.update();
    }
  }, [events, calendar]);

  // 🎨 EVENT STYLING FUNCTIONS
  const getDurationPriority = (duration: number): 'short' | 'medium' | 'long' => {
    if (duration <= 30) return 'short';
    if (duration <= 90) return 'medium';
    return 'long';
  };

  const getStatusColorPalette = (status: string) => {
    const palettes = {
      pending: {
        bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 25%, #b45309 100%)',
        border: '#b45309',
        bar: '#fbbf24',
        shadow: 'rgba(245, 158, 11, 0.3)'
      },
      booked: {
        bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 25%, #0e7490 100%)',
        border: '#0e7490',
        bar: '#67e8f9',
        shadow: 'rgba(6, 182, 212, 0.3)'
      },
      confirmed: {
        bg: 'linear-gradient(135deg, #10b981 0%, #059669 25%, #047857 100%)',
        border: '#047857',
        bar: '#34d399',
        shadow: 'rgba(16, 185, 129, 0.3)'
      },
      cancelled: {
        bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 25%, #b91c1c 100%)',
        border: '#b91c1c',
        bar: '#f87171',
        shadow: 'rgba(239, 68, 68, 0.3)'
      },
      noshow: {
        bg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 25%, #991b1b 100%)',
        border: '#991b1b',
        bar: '#fca5a5',
        shadow: 'rgba(220, 38, 38, 0.3)'
      },
      completed: {
        bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 25%, #6d28d9 100%)',
        border: '#6d28d9',
        bar: '#a78bfa',
        shadow: 'rgba(139, 92, 246, 0.3)'
      }
    };
    return palettes[status as keyof typeof palettes] || {
      bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 25%, #1d4ed8 100%)',
      border: '#1d4ed8',
      bar: '#60a5fa',
      shadow: 'rgba(59, 130, 246, 0.3)'
    };
  };

  const getServiceIcon = (serviceType: string) => {
    const iconClasses = "h-4 w-4";
    
    const iconMap = {
      'consultation': <ChatBubbleLeftRightIcon className={`${iconClasses} text-elysViolet-400`} />,
      'checkup': <MagnifyingGlassIcon className={`${iconClasses} text-elysPink-400`} />, 
      'treatment': <HeartIcon className={`${iconClasses} text-success-400`} />,
      'therapy': <SparklesIcon className={`${iconClasses} text-elysBlue-400`} />,
      'surgery': <BuildingOffice2Icon className={`${iconClasses} text-elysViolet-500`} />,
      'emergency': <ExclamationCircleIcon className={`${iconClasses} text-elysPink-600`} />
    };
    
    // Try to match service type with keywords
    const lowerService = serviceType.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerService.includes(key)) return icon;
    }
    
    return <CalendarDaysIcon className={`${iconClasses} text-elysPink-500`} />; // Default icon
  };

  // Helper function to get optimal time range based on appointments and availability
  const getOptimalTimeRange = () => {
    // Default business hours if no specific data
    let earliestHour = 6;
    let latestHour = 22;
    
    // Check existing appointments for actual time range
    if (events && events.length > 0) {
      const times = events.map(event => {
        const start = new Date(event.start.toString());
        return start.getHours();
      });
      
      const minHour = Math.min(...times);
      const maxHour = Math.max(...times);
      
      // Expand range to include appointment times with some buffer
      earliestHour = Math.max(0, Math.min(earliestHour, minHour - 1));
      latestHour = Math.min(23, Math.max(latestHour, maxHour + 2));
    }
    
    return { businessBegin: `${earliestHour}:00`, businessEnd: `${latestHour + 1}:00` };
  };
  
  // Get zoom-based cell height
  const getCellHeight = () => {
    switch (zoomLevel) {
      case 'compact': return 15; // Very compact for 24h view
      case 'normal': return 25;  // Normal size
      case 'spacious': return 35; // More space
      default: return 25;
    }
  };
  
  // Convert availability config to DayPilot business hours format
  const getBusinessHoursForCalendar = () => {
    if (!availabilityConfig) return null;
    
    const businessHours: any[] = [];
    
    // Map day names to DayPilot day numbers (0=Sunday, 1=Monday, etc.)
    const dayMapping: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };
    
    Object.entries(availabilityConfig).forEach(([dayName, config]: [string, any]) => {
      const dayNumber = dayMapping[dayName];
      
      if (config.isAvailable && config.timeSlots && config.timeSlots.length > 0) {
        config.timeSlots.forEach((slot: { start: string; end: string }) => {
          businessHours.push({
            day: dayNumber,
            start: slot.start,
            end: slot.end
          });
        });
      }
    });
    
    console.log('🕰️ Generated business hours:', businessHours);
    return businessHours;
  };

  // initializeNavigator removed - no longer needed

  const initializeCalendar = () => {
    if (!window.DayPilot || !calendarRef.current) return;

    let calendarInstance;
    const commonConfig = {
      events: events,
      eventMoveHandling: "Update",
      eventResizeHandling: "Update",
      timeRangeSelectedHandling: "Enabled",
      eventClickHandling: "Enabled",
      contextMenu: new window.DayPilot.Menu([
        {
          text: "View Details",
          onClick: (args: any) => {
            const appointmentData = args.source.data?.data || args.source.data;
            openAppointmentModal(appointmentData, 'view');
          }
        },
        {
          text: "Edit Appointment", 
          onClick: (args: any) => {
            const appointmentData = args.source.data?.data || args.source.data;
            openAppointmentModal(appointmentData, 'edit');
          }
        },
        {
          text: "-"
        },
        {
          text: "Export to ICS",
          onClick: (args: any) => {
            const appointmentData = args.source.data?.data || args.source.data;
            exportSingleEventToICS(appointmentData);
          }
        },
        {
          text: "Delete",
          onClick: async (args: any) => {
            if (await window.DayPilot.Modal.confirm("Delete this appointment?")) {
              const appointmentData = args.source.data?.data || args.source.data;
              handleDeleteAppointment(appointmentData.id);
            }
          }
        }
      ]),
      
      // 🎨 SIMPLIFIED EVENT RENDERING FOR DEBUGGING
      onBeforeEventRender: (args: any) => {
        console.log('🎨 onBeforeEventRender called for event:', args.data);
        
        const appointment = args.data.data;
        const tags = args.data.tags;
        
        if (!appointment) {
          console.warn('⚠️ No appointment data in event:', args.data);
          return;
        }
        
        if (!tags) {
          console.warn('⚠️ No tags in event:', args.data);
          return;
        }
        
        console.log('🎨 Rendering event for:', appointment.customerName, 'Status:', tags.status);
        
        // Show cancelled events in red (don't hide them)
        // if (tags.status === 'cancelled') {
        //   args.data.visible = false;
        //   return;
        // }

        // SIMPLE RENDERING - no complex HTML for debugging
        // Handle special statuses first (cancelled, noshow) then apply general palette
        if (tags.status === 'cancelled') {
          args.data.fontColor = "#ffffff";
          args.data.backColor = '#ef4444'; // Red background for cancelled
          args.data.borderColor = '#dc2626';
          args.data.barColor = '#f87171';
          args.data.text = `❌ ${appointment.customerName} - CANCELLED`;
        } else if (tags.status === 'noshow') {
          args.data.fontColor = "#ffffff";
          args.data.backColor = '#dc2626'; // Darker red background for no-show
          args.data.borderColor = '#991b1b';
          args.data.barColor = '#fca5a5';
          args.data.text = `⚠️ ${appointment.customerName} - NO-SHOW`;
        } else {
          // Apply general color palette for all other statuses
          const colorPalette = getStatusColorPalette(tags.status);
          args.data.backColor = colorPalette.bg;
          args.data.borderColor = colorPalette.border;
          args.data.barColor = colorPalette.bar;
          args.data.fontColor = "#ffffff";
          const serviceType = tags.serviceType && tags.serviceType !== 'null' ? tags.serviceType : 'Service';
          args.data.text = `${appointment.customerName} - ${serviceType} (${tags.duration}min)`;
        }
        
        args.data.toolTip = `${appointment.customerName} - ${tags.status} - ${String(appointment.datetime)}`;
        
        console.log('✅ Event rendered with simple styling');
      },
      
      onEventClick: (args: any) => {
        // Use the stored appointment data from event.data field
        const appointmentData = args.e.data?.data || args.e.data;
        openAppointmentModal(appointmentData, 'view');
      },
      onTimeRangeSelected: (args: any) => {
        setSelectedSlot({ start: args.start, end: args.end });
        openAppointmentModal(null, 'create');
      },
      onEventMoved: async (args: any) => {
        console.log('🔄 Moving event:', args);
        console.log('🔄 Event data:', args.e.data);
        console.log('🔄 Event ID:', args.e.data?.id);
        console.log('🔄 New start:', args.newStart);
        console.log('🔄 New start toString:', args.newStart.toString());
        console.log('🔄 New start value type:', typeof args.newStart);
        console.log('🔄 New start constructor:', args.newStart.constructor.name);
        
        // DEBUGGING: Check if DayPilot is doing timezone conversion
        const originalValue = args.newStart.toString();
        console.log('🕐 DEBUGGING TIMEZONE CONVERSION:');
        console.log('🕐 Original DayPilot value:', originalValue);
        console.log('🕐 Current timezone offset:', new Date().getTimezoneOffset());
        
        try {
          // EXTRACT LOCAL DATETIME FROM DAYPILOT OBJECT (NO UTC CONVERSION!)
          const dayPilotDate = args.newStart;
          
          // Avoid calling DayPilot.Date internal methods that may not exist across builds
          console.log('🔄 DayPilot Date string:', dayPilotDate.toString());
          
          // BUILD LOCAL DATETIME STRING using DayPilot string formatter to strict format
          const newDateTime = dayPilotDate.toString('yyyy-MM-dd HH:mm');
          console.log('🔄 BUILT LOCAL DATETIME (DayPilot):', newDateTime);
          
          console.log('🔄 Final datetime being sent to backend:', newDateTime);
          
          // Check if new datetime is within current view range
          const currentStartStr = startDate?.firstDayOfMonth().toString('yyyy-MM-dd');
          const currentEndStr = startDate?.lastDayOfMonth().toString('yyyy-MM-dd');
          const newDateStr = newDateTime.split(' ')[0]; // Extract date part from "YYYY-MM-DD HH:mm"
          
          console.log('📅 Date range check:', {
            newEventDate: newDateStr,
            currentViewStart: currentStartStr,
            currentViewEnd: currentEndStr,
            isWithinRange: newDateStr >= currentStartStr && newDateStr <= currentEndStr
          });
          
          await handleUpdateAppointment(args.e.data.id, {
            datetime: newDateTime
          });

          // Optimistically update the event position to avoid visual revert
          try {
            const newStart = new window.DayPilot.Date(dayPilotDate.toString());
            const durationMinutes = args.e.data?.tags?.duration || args.e.data?.data?.duration || 60;
            const newEnd = newStart.addMinutes(durationMinutes);

            // Update event data and refresh in DayPilot
            args.e.data.start = newStart;
            args.e.data.end = newEnd;
            if (args.e.update) {
              args.e.update();
            } else if (args.control?.events?.update) {
              args.control.events.update(args.e);
            }
            console.log('✅ Event moved visually to:', newStart.toString(), '→', newEnd.toString());
          } catch (visualErr) {
            console.warn('⚠️ Could not update event visually:', visualErr);
          }

          console.log('✅ Event move successful');
        } catch (error) {
          console.error('❌ Event move failed:', error);
          // Revert the move by refreshing calendar
          if (calendar) {
            console.log('🔄 Reverting move by refreshing events');
            refetchAppointments();
          }
        }
      },
      onEventResized: async (args: any) => {
        console.log('Resizing event:', args);
        const newDuration = args.newEnd.getTime() - args.newStart.getTime();
        await handleUpdateAppointment(args.e.data.id, {
          duration: Math.round(newDuration / (1000 * 60))
        });
      }
    };

    if (view === 'Month') {
      const cellHeight = zoomLevel === 'compact' ? 80 : zoomLevel === 'normal' ? 100 : 120;
      const businessHours = getBusinessHoursForCalendar();
      
      calendarInstance = new window.DayPilot.Month(calendarRef.current, {
        ...commonConfig,
        viewType: "Month",
        startDate: startDate,
        cellHeight: cellHeight,
        weekStarts: 1,
        headerHeight: Math.max(25, Math.floor(cellHeight * 0.3)),
        cellHeaderHeight: Math.max(20, Math.floor(cellHeight * 0.25)),
        showWeekend: true,
        
        // Business hours highlighting for month view
        businessHours: businessHours,
        businessHoursColor: "rgba(236, 72, 153, 0.04)", // elysPink-500 with 4% opacity for month view
        nonBusinessBackColor: "rgba(71, 85, 105, 0.02)", // Even more subtle for month
        
        // Custom styling for month view
        onAfterRender: () => {
          if (calendarRef.current) {
            const businessCells = calendarRef.current.querySelectorAll('.calendar_default_cell_business');
            businessCells.forEach((cell: any) => {
              cell.style.borderTop = '1px solid rgba(236, 72, 153, 0.15)'; // Subtle pink border for month
            });
          }
        },
        
        theme: "calendar_rouge_district"
      });

    } else {
      const timeRange = getOptimalTimeRange();
      const cellHeight = getCellHeight();
      
      const businessHours = getBusinessHoursForCalendar();
      
      calendarInstance = new window.DayPilot.Calendar(calendarRef.current, {
        ...commonConfig,
        viewType: view,
        startDate: startDate,
        
        // Dynamic time range based on actual appointments
        businessBeginsHour: parseInt(timeRange.businessBegin.split(':')[0]),
        businessEndsHour: parseInt(timeRange.businessEnd.split(':')[0]),
        
        // Zoom-based sizing
        cellHeight: cellHeight,
        headerHeight: Math.max(25, cellHeight),
        hourWidth: zoomLevel === 'compact' ? 50 : 60,
        cellHeaderHeight: Math.max(20, cellHeight - 5),
        
        // Better scroll handling
        scrollLabels: true,
        timeRangeSelectedHandling: "Enabled",
        
        // Business hours highlighting
        businessHours: businessHours,
        businessHoursColor: "rgba(168, 85, 247, 0.05)", // elysViolet-500 with 5% opacity
        nonBusinessBackColor: "rgba(71, 85, 105, 0.03)", // Very subtle slate background
        
        // Custom CSS for additional styling
        onAfterRender: () => {
          // Add custom styling for business hours if needed
          if (calendarRef.current) {
            const businessCells = calendarRef.current.querySelectorAll('.calendar_default_cell_business');
            businessCells.forEach((cell: any) => {
              cell.style.borderLeft = '2px solid rgba(168, 85, 247, 0.2)'; // Subtle violet border
            });
          }
        },
        
        theme: "calendar_rouge_district"
      });
    }

    calendarInstance.init();
    
    // Auto-scroll to current time or next appointment for better UX
    if (view === 'Day' || view === 'Week') {
      setTimeout(() => {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Find next appointment or use current time
        let scrollToHour = currentHour;
        
        if (events && events.length > 0) {
          const upcomingEvents = events
            .map(event => new Date(event.start.toString()))
            .filter(eventTime => eventTime > now)
            .sort((a, b) => a.getTime() - b.getTime());
            
          if (upcomingEvents.length > 0) {
            scrollToHour = Math.max(0, upcomingEvents[0].getHours() - 1); // 1 hour before next appointment
          }
        }
        
        // Scroll to the calculated hour
        try {
          calendarInstance.scrollTo(scrollToHour * 60); // DayPilot scrollTo expects minutes
        } catch (e) {
          console.log('Auto-scroll not available for this view');
        }
      }, 100); // Small delay to ensure calendar is fully rendered
    }
    
    setCalendar(calendarInstance);
  };

  const openAppointmentModal = (appointment: Appointment | null, mode: 'create' | 'edit' | 'view') => {
    setSelectedAppointment(appointment);
    setModalMode(mode);
    setShowAppointmentModal(true);
  };

  const handleCreateAppointment = async (appointmentData: any) => {
    try {
      await createAppointment(() => appointmentsApi.create(appointmentData));
      await refetchAppointments(); // ← FIXED: Now awaiting refetch!
      setShowAppointmentModal(false);
      window.DayPilot.Modal.alert("Appointment created successfully!");
    } catch (error) {
      console.error('❌ Error creating appointment:', error);
      window.DayPilot.Modal.alert("Error creating appointment");
    }
  };

  const handleUpdateAppointment = async (id: string, updates: any) => {
    console.log('🔄 handleUpdateAppointment called:', { id, updates });
    
    try {
      const result = await updateAppointment(() => appointmentsApi.update(id, updates));
      console.log('✅ Update API call successful:', result);
      
      await refetchAppointments();
      console.log('✅ Appointments refetched after update');
      
      // Only show modal if it was called from the modal
      if (showAppointmentModal) {
        setShowAppointmentModal(false);
        window.DayPilot.Modal.alert("Appointment updated successfully!");
      }
    } catch (error) {
      console.error('❌ Error updating appointment:', error);
      
      // Only show modal if it was called from the modal  
      if (showAppointmentModal) {
        window.DayPilot.Modal.alert("Error updating appointment");
      }
      
      // Always refresh on error to revert changes
      refetchAppointments();
      throw error; // Re-throw to trigger error handling in onEventMove
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await deleteAppointment(() => appointmentsApi.cancel(id));
      refetchAppointments();
      setShowAppointmentModal(false);
      window.DayPilot.Modal.alert("Appointment deleted successfully!");
    } catch (error) {
      window.DayPilot.Modal.alert("Error deleting appointment");
    }
  };

  const handleNoShowAppointment = async (id: string) => {
    try {
      await updateAppointment(() => appointmentsApi.update(id, { status: 'noshow' }));
      refetchAppointments();
      setShowAppointmentModal(false);
      window.DayPilot.Modal.alert("Appointment marked as No-Show!");
    } catch (error) {
      window.DayPilot.Modal.alert("Error marking appointment as No-Show");
    }
  };

  // Export functions
  const exportSingleEventToICS = (appointment: Appointment) => {
    const icsContent = generateICSContent([appointment]);
    downloadICS(icsContent, `appointment-${appointment.customerName}.ics`);
  };

  const exportAllToICS = () => {
    if (!appointmentsData?.data || !window.DayPilot) return;
    
    const icsContent = generateICSContent(appointmentsData.data);
    const filename = `calendar-export-${window.DayPilot.Date.today().toString('yyyy-MM-dd')}.ics`;
    downloadICS(icsContent, filename);
  };

  const copyIcsFeedUrl = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      // Try to fetch current user's token so URL can include it
      let tokenParam = '';
      try {
        const token = (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
        const resp = await fetch(`${baseUrl}/api/bot/me`, { credentials: 'include', headers: { 'Authorization': (token ? `Bearer ${token}` : '') } });
        if (resp.ok) {
          const me = await resp.json();
          if (me && me.calendarFeedToken) {
            tokenParam = `?token=${encodeURIComponent(me.calendarFeedToken)}`;
          }
        }
      } catch {}
      const feedUrl = `${baseUrl}/api/calendar/ics${tokenParam}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(feedUrl);
      } else {
        const input = document.createElement('input');
        input.value = feedUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      if (window.DayPilot?.Modal) {
        window.DayPilot.Modal.alert('ICS Feed URL copied to clipboard');
      }
    } catch (e) {
      console.error('Failed to copy ICS URL', e);
    }
  };

  const generateICSContent = (appointments: Appointment[]) => {
    if (!window.DayPilot) return '';
    
      const icsEvents = appointments.map(appointment => {
        const localStr = String(appointment.datetime).replace(' ', 'T').replace('Z', '').slice(0, 16);
        const startDate = new window.DayPilot.Date(localStr);
        const endDate = startDate.addMinutes(appointment.duration);
        const startTime = startDate.toString('yyyyMMddTHHmmss') + 'Z';
        const endTime = endDate.toString('yyyyMMddTHHmmss') + 'Z';
      
      return `BEGIN:VEVENT
UID:${appointment.id}@whatsappbot
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${appointment.customerName} - ${appointment.appointmentType}
DESCRIPTION:${appointment.notes || 'Leyla AI Appointment'}
LOCATION:Leyla AI
STATUS:${appointment.status.toUpperCase()}
END:VEVENT`;
    }).join('\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Leyla AI//Leyla AI Calendar Pro//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`;
  };

  const downloadICS = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Navigation functions
  const navigatePrevious = () => {
    if (!startDate) return;
    const newDate = view === 'Month' ? startDate.addMonths(-1) : 
                   view === 'Week' ? startDate.addDays(-7) : 
                   startDate.addDays(-1);
    setStartDate(newDate);
  };

  const navigateNext = () => {
    if (!startDate) return;
    const newDate = view === 'Month' ? startDate.addMonths(1) : 
                   view === 'Week' ? startDate.addDays(7) : 
                   startDate.addDays(1);
    setStartDate(newDate);
  };

  const navigateToday = () => {
    if (window.DayPilot) {
      setStartDate(window.DayPilot.Date.today());
    }
  };

  if (!isScriptLoaded || !startDate) {
    return (
      <div className={`bg-dark-700 rounded-lg shadow-lg border border-dark-600 ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-elysPink-500 mx-auto mb-4"></div>
          <p className="text-dark-200">Loading DayPilot Calendar Pro...</p>
          <p className="text-sm text-dark-300 mt-2">Modal • DatePicker • Scheduler</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-dark-700 rounded-lg shadow-lg border border-dark-600 ${className}`}>
      {/* Header with enhanced controls */}
      <div className="p-3 sm:p-4 border-b border-elysPink-600">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          
          {/* View selector with enhanced options */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
            {(['Month', 'Week', 'Day', 'Availability'] as const).map((v) => (
              <Button
                key={v}
                onClick={() => setView(v)}
                variant={view === v ? 'primary' : 'secondary'}
                className="text-xs sm:text-sm px-2.5 sm:px-3 py-2.5 flex items-center space-x-1.5 sm:space-x-2 min-h-[44px] flex-1 sm:flex-initial justify-center"
              >
                {v === 'Availability' ? (
                  <>
                    <Cog6ToothIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{v === 'Availability' ? 'Verfügb.' : v}</span>
                  </>
                ) : (
                  <>
                    <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
                    <span>{v}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
          
          {/* Right side controls - stacked */}
          {view !== 'Availability' && (
            <div className="flex flex-col sm:flex-col items-stretch sm:items-end space-y-2 w-full sm:w-auto">
              {/* Zoom Controls - hidden on mobile, visible on desktop */}
              <div className="hidden md:flex items-center space-x-1">
                <span className="text-xs text-dark-200 mr-2">Ansicht:</span>
                {(['compact', 'normal', 'spacious'] as const).map((zoom) => (
                  <Button
                    key={zoom}
                    onClick={() => setZoomLevel(zoom)}
                    variant={zoomLevel === zoom ? 'primary' : 'secondary'}
                    className="text-xs px-3 py-2 min-w-[60px] min-h-[44px]"
                    title={zoom === 'compact' ? '24h kompakt - weniger Scrollen' : zoom === 'normal' ? 'Normal' : 'Geräumig'}
                  >
                    {zoom === 'compact' ? '24h' : zoom === 'normal' ? 'Normal' : 'Groß'}
                  </Button>
                ))}
              </div>
              
              {/* Action buttons - responsive layout */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => openAppointmentModal(null, 'create')}
                  variant="primary"
                  className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2.5 text-sm font-medium min-h-[44px] w-full sm:w-auto"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">New Appointment</span>
                  <span className="sm:hidden">New</span>
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    onClick={exportAllToICS}
                    variant="secondary"
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2.5 text-sm font-medium min-h-[44px]"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Export ICS</span>
                    <span className="sm:hidden">Export</span>
                  </Button>

                  <Button
                    onClick={copyIcsFeedUrl}
                    variant="secondary"
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2.5 text-sm font-medium min-h-[44px]"
                    title="Copy ICS Feed URL"
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">ICS Feed URL</span>
                    <span className="sm:hidden">Feed</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced navigation */}
        {view !== 'Availability' && (
          <div className="flex justify-between items-center mt-3 sm:mt-4 gap-2">
            <Button 
              onClick={navigatePrevious} 
              variant="secondary" 
              className="px-3 py-2.5 flex items-center min-h-[44px] min-w-[44px] justify-center"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 flex-1">
              <h2 className="text-sm sm:text-lg font-semibold text-dark-50 text-center">
                {view === 'Month' ? startDate.toString('MMMM yyyy') : 
                 view === 'Week' ? `Week of ${startDate.toString('MMM dd, yyyy')}` :
                 startDate.toString('MMMM dd, yyyy')}
              </h2>
              <Button 
                onClick={navigateToday} 
                variant="secondary" 
                className="text-xs sm:text-sm px-3 py-2 min-h-[44px]"
              >
                Today
              </Button>
            </div>
            
            <Button 
              onClick={navigateNext} 
              variant="secondary" 
              className="px-3 py-2.5 flex items-center min-h-[44px] min-w-[44px] justify-center"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        {view === 'Availability' && (
          <div className="mt-3 sm:mt-4">
            <h2 className="text-base sm:text-lg font-semibold text-dark-50 flex items-center">
              <Cog6ToothIcon className="h-5 w-5 mr-2 text-elysBlue-500" />
              <span className="hidden sm:inline">Verfügbarkeiten konfigurieren</span>
              <span className="sm:hidden">Verfügbarkeiten</span>
            </h2>
            <p className="text-xs sm:text-sm text-dark-200 mt-1">
              Definiere deine wöchentlichen Arbeitszeiten und gesperrte Termine
            </p>
          </div>
        )}
      </div>

      {/* Main calendar area - full width */}
      <div className="p-3 sm:p-4">
        {view === 'Availability' ? (
          <AvailabilitySettings />
        ) : (
          <div 
            ref={calendarRef}
            className="daypilot-calendar-container" 
            style={{ minHeight: '600px' }}
          />
        )}
      </div>

      {/* Enhanced appointment modal would go here */}
      {showAppointmentModal && (
        <AppointmentModal
          appointment={selectedAppointment}
          mode={modalMode}
          services={services}
          selectedSlot={selectedSlot}
          onSave={modalMode === 'create' ? handleCreateAppointment : (data: any) => handleUpdateAppointment(selectedAppointment?.id || '', data)}
          onDelete={handleDeleteAppointment}
          onNoShow={handleNoShowAppointment}
          onClose={() => setShowAppointmentModal(false)}
          isLoading={isCreating || isUpdating || isDeleting}
        />
      )}
    </div>
  );
};

// Enhanced Appointment Modal Component
const AppointmentModal: React.FC<{
  appointment: Appointment | null;
  mode: 'create' | 'edit' | 'view';
  services: Service[];
  selectedSlot: {start: any, end: any} | null;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  onNoShow: (id: string) => void;
  onClose: () => void;
  isLoading: boolean;
}> = ({ appointment, mode, services, selectedSlot, onSave, onDelete, onNoShow, onClose, isLoading }) => {
  
  // Safe datetime conversion (NO TIMEZONE CONVERSION - ONLY STRINGS!)
  const getSafeDateTime = (appointment: Appointment | null, selectedSlot: {start: any, end: any} | null): string => {
    if (appointment?.datetime) {
      try {
        const datetimeStr = appointment.datetime.toString();
        
        if (datetimeStr.includes('T')) {
          // ISO format: "2025-08-12T11:00:00.000Z" or "2025-08-12T11:00:00"
          return datetimeStr.replace('Z', '').slice(0, 16);
        } else {
          // Local format: "2025-08-12 11:00" -> "2025-08-12T11:00"
          return datetimeStr.replace(' ', 'T').slice(0, 16);
        }
      } catch (error) {
        console.warn('⚠️ Invalid appointment datetime:', appointment.datetime, error);
      }
    }
    
    if (selectedSlot?.start) {
      try {
        // EXTRACT LOCAL TIME FROM DAYPILOT DATE OBJECT (NO toString!)
        const dayPilotDate = selectedSlot.start;
        const year = dayPilotDate.getYear();
        const month = String(dayPilotDate.getMonth() + 1).padStart(2, '0');
        const day = String(dayPilotDate.getDate()).padStart(2, '0');
        const hour = String(dayPilotDate.getHours()).padStart(2, '0');
        const minute = String(dayPilotDate.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
      } catch (error) {
        console.warn('⚠️ Invalid selectedSlot start:', selectedSlot.start, error);
      }
    }
    
    // Fallback to current local time (NO TIMEZONE CONVERSION)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const [formData, setFormData] = useState({
    customerName: appointment?.customerName || '',
    customerPhone: appointment?.customerPhone || '',
    customerEmail: appointment?.customerEmail || '',
    datetime: getSafeDateTime(appointment, selectedSlot),
    duration: appointment?.duration || 60,
    notes: appointment?.notes || '',
    serviceId: appointment?.appointmentType || (services && services.length > 0 ? services[0].id : ''),
    status: appointment?.status || 'booked'
  });

  // Update serviceId when services are loaded
  React.useEffect(() => {
    if (services && services.length > 0 && !formData.serviceId) {
      console.log('🔄 AppointmentModal: Setting default service:', services[0]);
      setFormData(prev => ({ 
        ...prev, 
        serviceId: services[0].id,
        duration: services[0].durationMinutes || 60
      }));
    }
  }, [services, formData.serviceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // NO TIMEZONE CONVERSION - use datetime as-is
    const appointmentData = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      datetime: formData.datetime, // Send as simple datetime string without timezone
      duration: formData.duration,
      notes: formData.notes,
      appointmentType: formData.serviceId,
      status: formData.status
    };

    console.log('🕐 NO Timezone Conversion:', {
      originalInput: formData.datetime,
      sentToBackend: appointmentData.datetime,
      message: 'Using datetime as-is without timezone conversion'
    });

    if (mode === 'create') {
      onSave(appointmentData);
    } else if (mode === 'edit' && appointment) {
      onSave(appointmentData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-dark-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-dark-600">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-dark-50 flex items-center">
              {mode === 'create' && <><PlusIcon className="h-5 w-5 mr-2 text-elysPink-500" /><span className="hidden sm:inline">Create Appointment</span><span className="sm:hidden">New</span></>}
              {mode === 'edit' && <><PencilIcon className="h-5 w-5 mr-2 text-elysViolet-500" /><span className="hidden sm:inline">Edit Appointment</span><span className="sm:hidden">Edit</span></>}
              {mode === 'view' && <><EyeIcon className="h-5 w-5 mr-2 text-elysBlue-500" /><span className="hidden sm:inline">View Appointment</span><span className="sm:hidden">View</span></>}
            </h2>
            <button
              onClick={onClose}
              className="text-dark-300 hover:text-elysPink-400 text-2xl transition-colors duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {mode === 'view' ? (
            // View mode
            <div className="space-y-3 sm:space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-dark-200 mb-1">Customer</label>
                  <div className="flex items-center text-dark-50 text-sm">
                    <UserIcon className="h-4 w-4 mr-2 text-dark-300" />
                    {appointment?.customerName}
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-dark-200 mb-1">Phone</label>
                  <div className="flex items-center text-dark-50 text-sm">
                    <PhoneIcon className="h-4 w-4 mr-2 text-dark-300" />
                    {appointment?.customerPhone}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-dark-200 mb-1">Email</label>
                <p className="text-dark-50 text-sm">{appointment?.customerEmail}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-1">Date & Time</label>
                  <div className="flex items-center text-dark-50">
                    <ClockIcon className="h-4 w-4 mr-2 text-dark-300" />
                    {appointment && formatDateTime(appointment.datetime)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-1">Duration</label>
                  <p className="text-dark-50">{appointment?.duration} minutes</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Service</label>
                <p className="text-dark-50">{appointment?.appointmentType}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  appointment?.status === 'confirmed' ? 'bg-success-500 text-white' :
                  appointment?.status === 'booked' ? 'bg-cyan-500 text-white' :
                  appointment?.status === 'pending' ? 'bg-elysPink-500 text-white' :
                  appointment?.status === 'cancelled' ? 'bg-red-500 text-white' :
                  appointment?.status === 'noshow' ? 'bg-red-500 text-white' :
                  appointment?.status === 'completed' ? 'bg-purple-500 text-white' :
                  'bg-dark-600 text-dark-100'
                }`}>
                  {appointment?.status === 'noshow' ? 'No-Show' : appointment?.status}
                </span>
              </div>
              
              {appointment?.notes && (
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-1">Notes</label>
                  <p className="text-dark-50">{appointment.notes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                {appointment?.status !== 'cancelled' && appointment?.status !== 'noshow' && (
                  <>
                    <Button
                      onClick={() => onNoShow(appointment?.id || '')}
                      variant="secondary"
                      className="text-red-600 hover:text-red-700 min-h-[44px] w-full sm:w-auto"
                      disabled={isLoading}
                    >
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      No-Show
                    </Button>
                    <Button
                      onClick={() => onDelete(appointment?.id || '')}
                      variant="secondary"
                      className="text-red-600 hover:text-red-700 min-h-[44px] w-full sm:w-auto"
                      disabled={isLoading}
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
                <Button onClick={onClose} variant="secondary" className="min-h-[44px] w-full sm:w-auto">
                  Close
                </Button>
              </div>
            </div>
          ) : (
            // Create/Edit form
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Customer Name"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                />
                <Input
                  label="Phone"
                  required
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                />
              </div>

              <Input
                label="Email"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date & Time"
                  type="datetime-local"
                  required
                  value={formData.datetime}
                  onChange={(e) => setFormData(prev => ({ ...prev, datetime: e.target.value }))}
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  required
                  min="15"
                  max="480"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-1">
                <Select
                  label="Service"
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
                  options={services.length > 0 ? services.map(service => ({
                    value: service.id,
                    label: `${service.name} - $${service.price} (${service.durationMinutes}min)`
                  })) : [
                    { value: '', label: 'No services available - Configure services in Bot Settings first' }
                  ]}
                />
                {services.length === 0 && (
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                    <p className="font-medium flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                      No Services Configured
                    </p>
                    <p>Go to Bot Configuration → Services & Prices to add services first.</p>
                  </div>
                )}
              </div>

              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'pending' | 'booked' | 'confirmed' | 'cancelled' | 'completed' | 'noshow' }))}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "booked", label: "Booked" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "completed", label: "Completed" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "noshow", label: "No-Show" }
                ]}
              />

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                <Button onClick={onClose} variant="secondary" type="button" className="min-h-[44px] w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="min-h-[44px] w-full sm:w-auto">
                  {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPro;
