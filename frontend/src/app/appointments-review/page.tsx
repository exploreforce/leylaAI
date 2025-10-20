'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetch, useApi } from '@/hooks/useApi';
import { reviewApi } from '@/utils/api';
import { Appointment } from '@/types';
import AppointmentReviewCard from '@/components/review/AppointmentReviewCard';
import RejectModal from '@/components/review/RejectModal';
import Alert from '@/components/ui/Alert';
import { ClockIcon, FunnelIcon } from '@heroicons/react/24/outline';

const AppointmentsReview = () => {
  const { t } = useTranslation('common');
  const { data, isLoading, error, refetch } = useFetch(
    () => reviewApi.getPendingAppointments(),
    []
  );

  const { execute: approveAppointment, isLoading: isApproving } = useApi();
  const { execute: rejectAppointment, isLoading: isRejecting } = useApi();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'flagged'>('all');
  const [rejectingAppointment, setRejectingAppointment] = useState<Appointment | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update appointments when data loads
  useEffect(() => {
    if (data?.data) {
      setAppointments(data.data);
    }
  }, [data]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleApprove = async (appointmentId: string) => {
    try {
      await approveAppointment(() => reviewApi.approveAppointment(appointmentId));
      setSuccessMessage(t('messages.approval_success'));
      setTimeout(() => setSuccessMessage(null), 3000);
      refetch();
    } catch (error) {
      console.error('Failed to approve appointment:', error);
    }
  };

  const handleRejectClick = (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (appointment) {
      setRejectingAppointment(appointment);
    }
  };

  const handleRejectConfirm = async (appointmentId: string, reason: string) => {
    try {
      await rejectAppointment(() => reviewApi.rejectAppointment(appointmentId, reason));
      setSuccessMessage(t('messages.rejection_success'));
      setTimeout(() => setSuccessMessage(null), 3000);
      setRejectingAppointment(null);
      refetch();
    } catch (error) {
      console.error('Failed to reject appointment:', error);
      setRejectingAppointment(null);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filterMode === 'flagged') {
      // TODO: Filter by red flag status when available in appointment metadata
      return true;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-elysPink-600"></div>
        <span className="ml-2 text-dark-200">{t('messages.loading_appointments')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" message={`${t('actions.error')}: ${error}`} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-8 w-8 text-elysPink-500" />
          <div>
            <h1 className="text-2xl font-bold text-dark-50">
              {t('navigation.review')}
            </h1>
            <p className="text-sm text-dark-300">
              {filteredAppointments.length} {filteredAppointments.length === 1 ? t('appointments.appointment') : t('appointments.appointments')} {t('appointments.to_review')}
            </p>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-dark-400" />
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as 'all' | 'flagged')}
            className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-elysPink-500"
          >
            <option value="all">{t('filters.show_all')}</option>
            <option value="flagged">{t('filters.only_red_flags')}</option>
          </select>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert type="success" message={successMessage} />
      )}

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="h-16 w-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-200 mb-2">
            {t('messages.no_appointments')}
          </h3>
          <p className="text-sm text-dark-400">
            {t('messages.no_appointments')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAppointments.map((appointment) => (
            <AppointmentReviewCard
              key={appointment.id}
              appointment={appointment}
              onApprove={handleApprove}
              onReject={handleRejectClick}
              isLoading={isApproving || isRejecting}
              showRedFlagBadge={false} // TODO: Add red flag detection
            />
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingAppointment && (
        <RejectModal
          appointmentId={rejectingAppointment.id}
          customerName={rejectingAppointment.customerName}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingAppointment(null)}
          isLoading={isRejecting}
        />
      )}
    </div>
  );
};

export default AppointmentsReview;

