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

export interface BotConfig {
  id: string;
  // Legacy fields
  systemPrompt: string;
  tone: 'professional' | 'friendly' | 'casual'; // deprecated, use personalityTone
  businessHours: string;
  timezone: string;
  maxAppointmentDuration: number;
  bufferTime: number;
  
  // New configuration fields
  botName: string;
  botDescription: string;
  personalityTone: PersonalityTone;
  characterTraits: string;
  backgroundInfo: string;
  servicesOffered: string;
  escalationRules: string;
  botLimitations: string;
  behaviorGuidelines?: string;
  generatedSystemPrompt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Appointment Types
export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  datetime: string;
  duration: number;
  status: 'pending' | 'booked' | 'confirmed' | 'cancelled' | 'completed' | 'noshow';
  notes?: string;
  appointmentType?: string;
  createdAt: string;
  updatedAt: string;
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

// Calendar Types
export interface TimeSlot {
  start: string;
  end: string;
}

export interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

export interface WeeklySchedule {
  [key: string]: DayAvailability;
}

export interface AvailabilityConfig {
  id: string;
  weeklySchedule: WeeklySchedule;
  blackoutDates: BlackoutDate[];
  createdAt: string;
  updatedAt: string;
}

export interface BlackoutDate {
  id?: string;
  date: string;
  reason?: string;
  isRecurring?: boolean;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    toolCalls?: ToolCall[];
    appointmentId?: string;
    approved?: boolean;
    isCustomReply?: boolean;
    isDraft?: boolean;
    status?: 'draft' | 'approved' | 'sent' | 'pending';
  };
}

export interface ToolCall {
  name: string;
  parameters: any;
  result?: any;
  status: 'pending' | 'completed' | 'error';
}

export interface TestChatSession {
  id: string;
  sessionNumber: number;
  status: 'active' | 'archived' | 'inactive';
  messages: ChatMessage[];
  createdAt: string;
  lastActivity: string;
}

export interface ChatSession {
  id: string;
  sessionNumber: number;
  status: 'active' | 'archived' | 'inactive';
  createdAt: string;
  lastActivity: string;
  isFlagged?: boolean;
  stats: {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    draftMessages: number;
  };
  lastMessage: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  } | null;
}

// UI Types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface NotificationState {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationMinutes?: number;
  sortOrder?: number;
} 