// Stats & Analytics Types (Frontend)
export interface AppointmentStats {
  total: number;
  confirmed: number;
  cancelled: number;
  noshow: number;
  completed: number;
  pending: number;
  conversionRate: string;
  noshowRate: string;
  uniqueCustomers: number;
}

export interface ChatStats {
  totalSessions: number;
  whatsappSessions: number;
  testSessions: number;
  avgMessagesPerSession: string;
}

export interface RedFlagStats {
  total: number;
  rate: string;
  recentFlags: RedFlag[];
}

export interface RedFlag {
  id: string;
  timestamp: Date | string;
  customerPhone: string;
  content: string;
  sentiment: string;
}

export interface RevenueStats {
  total: number;
  byService: ServiceRevenue[];
}

export interface ServiceRevenue {
  name: string;
  revenue: number;
  bookings: number;
  currency: string;
}

export interface ServiceStats {
  id: string;
  name: string;
  bookingCount: number;
  totalRevenue: number;
  avgDuration: number;
}

export interface WeekdayDistribution {
  dayOfWeek: number;
  dayName: string;
  count: number;
}

export interface HourDistribution {
  hour: number;
  count: number;
}

export interface TopCustomer {
  name: string;
  phone: string;
  bookings: number;
  totalRevenue: number;
  lastBooking: Date | string;
}

export interface TimelineData {
  labels: string[];
  bookings: number[];
  cancellations: number[];
  revenue: number[];
}

export interface StatsFilters {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month';
}

export interface DashboardStats {
  appointments: AppointmentStats;
  chats: ChatStats;
  redFlags: RedFlagStats;
  revenue: RevenueStats;
}

export interface DetailedAppointmentStats {
  topServices: { name: string; bookingCount: number }[];
  weekdayDistribution: WeekdayDistribution[];
  hourDistribution: HourDistribution[];
  topCustomers: TopCustomer[];
}

