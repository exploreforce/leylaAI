import { getToken } from './auth';
import { DashboardStats, DetailedAppointmentStats, ServiceStats, TimelineData, StatsFilters } from '../types/stats';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const statsApi = {
  /**
   * Get overview stats for dashboard
   */
  getOverview: async (filters?: StatsFilters): Promise<{ success: boolean; data: DashboardStats }> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const res = await fetch(`${API_BASE_URL}/api/stats/overview?${params}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch overview stats');
    }
    
    return res.json();
  },

  /**
   * Get detailed appointment statistics
   */
  getAppointments: async (filters?: StatsFilters): Promise<{ success: boolean; data: DetailedAppointmentStats }> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const res = await fetch(`${API_BASE_URL}/api/stats/appointments?${params}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch appointment stats');
    }
    
    return res.json();
  },

  /**
   * Get service performance statistics
   */
  getServices: async (filters?: StatsFilters): Promise<{ success: boolean; data: ServiceStats[] }> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const res = await fetch(`${API_BASE_URL}/api/stats/services?${params}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch service stats');
    }
    
    return res.json();
  },

  /**
   * Get timeline data for charts
   */
  getTimeline: async (period: 'day' | 'week' | 'month', filters?: StatsFilters): Promise<{ success: boolean; data: TimelineData }> => {
    const params = new URLSearchParams();
    params.append('period', period);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const res = await fetch(`${API_BASE_URL}/api/stats/timeline?${params}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch timeline data');
    }
    
    return res.json();
  },

  /**
   * Export stats as CSV
   */
  exportCSV: async (filters?: StatsFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const res = await fetch(`${API_BASE_URL}/api/stats/export?${params}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    
    if (!res.ok) {
      throw new Error('Failed to export stats');
    }
    
    return res.blob();
  },
};

