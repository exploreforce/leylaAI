import axios from 'axios';
import { getToken } from './auth';
import { ApiResponse, BotConfig, Appointment, AvailabilityConfig, CreateAppointmentRequest, ChatMessage, TestChatSession, Service, CreateServiceRequest } from '@/types';

// Determine API base URL. Prefer env; fallback to current origin at runtime.
const resolveBaseUrl = () => {
  const envBase = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (envBase) {
    return envBase.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'http://localhost:5000';
};

const BASE_URL = resolveBaseUrl();

// 🔍 DEBUG: Log the actual API URL being used
console.log('🌐 API Configuration:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  resolvedBaseURL: BASE_URL,
  fullApiURL: `${BASE_URL}/api`
});

// Create axios instance with default config
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {} as any;
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    throw error.response?.data || error;
  }
);

// Bot Configuration API
export const botApi = {
  getConfig: async (): Promise<ApiResponse<BotConfig>> => {
    console.log('🔍 botApi.getConfig: Making request to /bot/config');
    try {
      const result = await api.get('/bot/config') as ApiResponse<BotConfig>;
      console.log('🔍 botApi.getConfig: Raw result:', result);
      console.log('🔍 botApi.getConfig: Result has ID?', !!result?.data?.id);
      console.log('🔍 botApi.getConfig: Result ID:', result?.data?.id);
      return result;
    } catch (error) {
      console.error('❌ botApi.getConfig: Failed:', error);
      throw error;
    }
  },

  updateConfig: async (config: Partial<BotConfig>): Promise<ApiResponse<BotConfig>> => {
    return api.put('/bot/config', config);
  },

  testChat: async (messages: ChatMessage[], sessionId: string, targetLanguage?: string): Promise<ApiResponse<{ response: ChatMessage }>> => {
    return api.post('/bot/test-chat', { messages, sessionId, targetLanguage });
  },

  createTestChatSession: async (): Promise<ApiResponse<TestChatSession>> => {
    return api.post('/bot/test-chat/session');
  },

  getTestChatSession: async (sessionId: string): Promise<ApiResponse<TestChatSession>> => {
    return api.get(`/bot/test-chat/session/${sessionId}`);
  },

  getActiveTestChatSession: async (): Promise<ApiResponse<TestChatSession>> => {
    return api.get('/bot/test-chat/active-session');
  },

  getChatsForReview: async (): Promise<ApiResponse<any[]>> => {
    return api.get('/bot/chats/review');
  },

  getChatForReview: async (chatId: string): Promise<ApiResponse<any>> => {
    return api.get(`/bot/chats/review/${chatId}`);
  },

  approveTestChatDraft: async (sessionId: string): Promise<ApiResponse<any>> => {
    return api.post('/bot/test-chat/approve', { sessionId });
  },

  sendTestChatMessage: async (sessionId: string, content: string): Promise<ApiResponse<any>> => {
    return api.post('/bot/test-chat/send', { sessionId, content });
  },

  getAllTestChatSessions: async (): Promise<ApiResponse<any[]>> => {
    return api.get('/bot/test-chat/sessions');
  },

  deleteTestChatSession: async (sessionId: string): Promise<ApiResponse<any>> => {
    return api.delete(`/bot/test-chat/sessions/${sessionId}`);
  },

  updateSessionStatus: async (sessionId: string, status: 'active' | 'archived' | 'inactive'): Promise<ApiResponse<any>> => {
    return api.patch(`/bot/test-chat/sessions/${sessionId}/status`, { status });
  },

  // Language Settings API
  getLanguages: async (): Promise<ApiResponse<any[]>> => {
    return api.get('/bot/languages');
  },

  getCurrentLanguage: async (): Promise<ApiResponse<any>> => {
    return api.get('/bot/language-setting');
  },

  updateLanguage: async (language_code: string): Promise<ApiResponse<any>> => {
    return api.put('/bot/language-setting', { language_code });
  },
};

// Appointments API
export const appointmentsApi = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<ApiResponse<Appointment[]>> => {
    // 🔧 FIX: Disable browser cache to ensure fresh data after CREATE/UPDATE
    return api.get('/appointments', { 
      params,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },

  create: async (appointment: CreateAppointmentRequest): Promise<ApiResponse<Appointment>> => {
    return api.post('/appointments', appointment);
  },

  update: async (id: string, updates: Partial<Appointment>): Promise<ApiResponse<Appointment>> => {
    return api.put(`/appointments/${id}`, updates);
  },

  cancel: async (id: string): Promise<ApiResponse<{ appointmentId: string }>> => {
    return api.delete(`/appointments/${id}`);
  },
};

// Calendar API
export const calendarApi = {
  getAvailability: async (params?: {
    date?: string;
    duration?: number;
  }): Promise<ApiResponse<{ date: string; availableSlots: Array<{ start: string; end: string }> }>> => {
    return api.get('/calendar/availability', { params });
  },

  updateAvailability: async (data: {
    weeklySchedule: any;
    blackoutDates: any[];
  }): Promise<ApiResponse<AvailabilityConfig>> => {
    return api.put('/calendar/availability', data);
  },

  getOverview: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{
    period: { startDate: string; endDate: string };
    totalAppointments: number;
    availableSlots: number;
    busySlots: number;
  }>> => {
    return api.get('/calendar/overview', { params });
  },
};

// Services API
export const servicesApi = {
  getAll: async (botConfigId: string): Promise<ApiResponse<Service[]>> => {
    console.log('🔍 servicesApi.getAll: Called with botConfigId:', botConfigId);
    console.log('🔍 servicesApi.getAll: Making request to:', `/services/${botConfigId}`);
    
    try {
      const result = await api.get(`/services/${botConfigId}`) as ApiResponse<Service[]>;
      console.log('🔍 servicesApi.getAll: Raw API result:', result);
      return result;
    } catch (error) {
      console.error('❌ servicesApi.getAll: API call failed:', error);
      throw error;
    }
  },

  create: async (botConfigId: string, service: CreateServiceRequest): Promise<ApiResponse<Service>> => {
    return api.post(`/services/${botConfigId}`, service);
  },

  update: async (serviceId: string, updates: Partial<CreateServiceRequest>): Promise<ApiResponse<Service>> => {
    return api.put(`/services/${serviceId}`, updates);
  },

  delete: async (serviceId: string): Promise<ApiResponse<{ serviceId: string }>> => {
    return api.delete(`/services/${serviceId}`);
  },
};

// Review API
export const reviewApi = {
  getPendingAppointments: async (): Promise<ApiResponse<Appointment[]>> => {
    return api.get('/review/pending-appointments', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },

  getReviewStats: async (): Promise<ApiResponse<{ pendingCount: number }>> => {
    return api.get('/review/stats');
  },

  approveAppointment: async (appointmentId: string): Promise<ApiResponse<Appointment>> => {
    return api.post(`/review/approve/${appointmentId}`);
  },

  rejectAppointment: async (appointmentId: string, reason?: string): Promise<ApiResponse<Appointment>> => {
    return api.post(`/review/reject/${appointmentId}`, { reason });
  },
};

// Auth API
export const authApi = {
  getCurrentUser: async (): Promise<ApiResponse<{ userId: string; accountId: string; email: string; role: string }>> => {
    return api.get('/auth/me');
  },
};

// Admin API
export const adminApi = {
  getAllAccounts: async (): Promise<ApiResponse<{
    accounts: Array<{
      accountId: string;
      accountName: string;
      createdAt: string;
      updatedAt: string;
      users: Array<{
        userId: string;
        email: string;
        role: string;
        lastLogin: string | null;
        createdAt: string;
        appointmentsCreated: number;
      }>;
      stats: {
        totalAppointments: number;
        totalUsers: number;
      };
    }>;
  }>> => {
    return api.get('/admin/users/accounts');
  },

  changeUserRole: async (userId: string, role: 'admin' | 'user'): Promise<ApiResponse<{ userId: string; role: string }>> => {
    return api.put(`/admin/users/users/${userId}/role`, { role });
  },

  deleteUser: async (userId: string): Promise<ApiResponse<{ userId: string }>> => {
    return api.delete(`/admin/users/users/${userId}`);
  },

  moveUser: async (userId: string, newAccountId: string): Promise<ApiResponse<{
    userId: string;
    oldAccountId: string;
    newAccountId: string;
  }>> => {
    return api.put(`/admin/users/users/${userId}/move`, { newAccountId });
  },
};

// Health check
export const healthApi = {
  checkStatus: async (): Promise<{ status: string; timestamp: string; environment: string }> => {
    return axios.get(`${BASE_URL}/health`).then(response => response.data);
  },
};

export default api; 