'use client';

import { useEffect, useState } from 'react';
import { AdminRoute } from '@/components/ProtectedRoute';
import StatsCard from '@/components/dashboard/StatsCard';
import AppointmentChart from '@/components/dashboard/AppointmentChart';
import ServiceRanking from '@/components/dashboard/ServiceRanking';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import ExportButton from '@/components/dashboard/ExportButton';
import RedFlagLog from '@/components/dashboard/RedFlagLog';
import TopCustomersTable from '@/components/dashboard/TopCustomersTable';
import { statsApi } from '@/utils/statsApi';
import { DashboardStats, DetailedAppointmentStats, TimelineData, StatsFilters } from '@/types/stats';
import {
  CalendarIcon,
  XCircleIcon,
  FlagIcon,
  BanknotesIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedAppointmentStats | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StatsFilters>({});
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchAllStats();
  }, [filters, selectedPeriod]);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const [overviewRes, detailedRes, timelineRes] = await Promise.all([
        statsApi.getOverview(filters),
        statsApi.getAppointments(filters),
        statsApi.getTimeline(selectedPeriod, filters),
      ]);

      setStats(overviewRes.data);
      setDetailedStats(detailedRes.data);
      setTimelineData(timelineRes.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (startDate: string, endDate: string) => {
    setFilters({ startDate, endDate, period: selectedPeriod });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elysPink-600"></div>
      </div>
    );
  }

  if (!stats || !detailedStats || !timelineData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Fehler beim Laden der Statistiken.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Übersicht aller Statistiken und Metriken</p>
        </div>
        <ExportButton filters={filters} />
      </div>

      {/* Date Filter */}
      <DateRangeFilter onFilterChange={handleFilterChange} />

      {/* Period Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedPeriod('day')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedPeriod === 'day'
              ? 'bg-elysPink-600 text-white'
              : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
          }`}
        >
          Täglich
        </button>
        <button
          onClick={() => setSelectedPeriod('week')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedPeriod === 'week'
              ? 'bg-elysPink-600 text-white'
              : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
          }`}
        >
          Wöchentlich
        </button>
        <button
          onClick={() => setSelectedPeriod('month')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedPeriod === 'month'
              ? 'bg-elysPink-600 text-white'
              : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
          }`}
        >
          Monatlich
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Gesamtbuchungen"
          value={stats.appointments.total}
          icon={<CalendarIcon className="w-6 h-6" />}
          trend={`${stats.appointments.confirmed} bestätigt`}
          color="blue"
        />
        <StatsCard
          title="Absagen"
          value={stats.appointments.cancelled}
          icon={<XCircleIcon className="w-6 h-6" />}
          trend={`Rate: ${stats.appointments.conversionRate}%`}
          color="red"
        />
        <StatsCard
          title="Red Flags"
          value={stats.redFlags.total}
          icon={<FlagIcon className="w-6 h-6" />}
          trend={`Rate: ${stats.redFlags.rate}%`}
          color="yellow"
        />
        <StatsCard
          title="Gesamtumsatz"
          value={`€${stats.revenue.total.toFixed(2)}`}
          icon={<BanknotesIcon className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Additional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Chat-Sitzungen"
          value={stats.chats.totalSessions}
          icon={<ChatBubbleLeftIcon className="w-6 h-6" />}
          trend={`${stats.chats.whatsappSessions} WhatsApp`}
          color="purple"
        />
        <StatsCard
          title="No-Shows"
          value={stats.appointments.noshow}
          icon={<XCircleIcon className="w-6 h-6" />}
          trend={`Rate: ${stats.appointments.noshowRate}%`}
          color="red"
        />
        <StatsCard
          title="Unique Kunden"
          value={stats.appointments.uniqueCustomers}
          icon={<ChartBarIcon className="w-6 h-6" />}
          trend="Verschiedene Telefonnummern"
          color="blue"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AppointmentChart data={timelineData} />
        <ServiceRanking services={detailedStats.topServices} />
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6">
        <RedFlagLog flags={stats.redFlags.recentFlags} />
        <TopCustomersTable customers={detailedStats.topCustomers} />
      </div>
    </div>
  );
}

