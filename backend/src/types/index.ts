// Bot Configuration Types
export type PersonalityTone = 
  | 'professional' 
  | 'friendly' 
  | 'casual' 
  | 'flirtatious' 
  | 'direct' 
  | 'emotional' 
  | 'warm' 
  | 'confident' 
  | 'playful';

export type ReviewMode = 'always' | 'never' | 'on_redflag';

export interface BotConfig {
  id: string;
  // Legacy fields
  systemPrompt: string;
  tone: 'professional' | 'friendly' | 'casual'; // deprecated, use personalityTone
  businessHours: string;
  timezone: string;
  maxAppointmentDuration: number;
  bufferTime: number; // minutes between appointments
  
  // New configuration fields
  botName: string;
  botDescription: string;
  personalityTone: PersonalityTone;
  characterTraits: string;
  backgroundInfo: string;
  servicesOffered: string;
  escalationRules: string;
  botLimitations: string;
  generatedSystemPrompt?: string;
  reviewMode?: ReviewMode;
  
  createdAt: Date;
  updatedAt: Date;
}

// Service Types
export interface Service {
  id: string;
  botConfigId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  durationMinutes?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationMinutes?: number;
  sortOrder?: number;
}

// Appointment Types
export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  datetime: Date;
  duration: number; // in minutes
  status: 'pending' | 'booked' | 'confirmed' | 'cancelled' | 'completed' | 'noshow';
  notes?: string;
  appointmentType?: string;
  serviceName?: string; // Service name resolved from services table
  accountId?: string; // Multi-tenant support: which account this appointment belongs to
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  datetime: string;
  duration: number;
  notes?: string;
  appointmentType?: string;
}

// Calendar/Availability Types
export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface DayAvailability {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

export interface WeeklySchedule {
  [key: string]: DayAvailability; // 'monday', 'tuesday', etc.
}

export interface BlackoutDate {
  date: Date;
  reason?: string;
  isRecurring?: boolean;
}

export interface AvailabilityConfig {
  id: string;
  weeklySchedule: WeeklySchedule;
  blackoutDates: BlackoutDate[];
  createdAt: Date;
  updatedAt: Date;
}

// AI Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    // Legacy metadata
    toolCalls?: ToolCall[];
    appointmentId?: string;
    status?: 'draft' | 'sent';
    
    // New structured output metadata (revised schema)
    userLanguage?: string; // detected language code for the turn
    isFlagged?: boolean; // moderation flag
    userSentiment?: string; // qualitative label
    userInformation?: string; // rolling summary to carry across turns
  };
}

export interface ToolCall {
  name: string;
  parameters: any;
  result?: any;
  status: 'pending' | 'completed' | 'error';
}

export interface DbChatMessage extends Omit<ChatMessage, 'id'> {
  session_id: string;
}

export interface TestChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  lastActivity: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// WhatsApp Integration Types (for future use)
export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  type: 'text' | 'image' | 'audio' | 'document';
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

export interface WhatsAppContact {
  phone: string;
  name?: string;
  profilePicture?: string;
  lastActivity?: Date;
} 