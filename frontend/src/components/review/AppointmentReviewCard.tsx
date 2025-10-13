'use client';

import React from 'react';
import { Appointment } from '@/types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { 
  CheckIcon, 
  XMarkIcon, 
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { formatAppointmentDate, formatAppointmentTime } from '@/utils/timezone';

interface AppointmentReviewCardProps {
  appointment: Appointment;
  onApprove: (appointmentId: string) => void;
  onReject: (appointmentId: string) => void;
  isLoading?: boolean;
  showRedFlagBadge?: boolean;
}

const AppointmentReviewCard: React.FC<AppointmentReviewCardProps> = ({
  appointment,
  onApprove,
  onReject,
  isLoading = false,
  showRedFlagBadge = false,
}) => {
  // Parse UTC datetime from backend and display in local timezone
  const formattedDate = formatAppointmentDate(appointment.datetime);
  const formattedTime = formatAppointmentTime(appointment.datetime);
  const formattedDateTime = `${formattedDate} um ${formattedTime} Uhr`;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-dark-50">
                {appointment.customerName}
              </h3>
              {showRedFlagBadge && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  🚩 RedFlag
                </span>
              )}
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                <ClockIcon className="h-3 w-3 mr-1" />
                Pending Review
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-dark-300">
            <CalendarIcon className="h-5 w-5 mr-2 text-elysPink-500" />
            <span>{formattedDateTime}</span>
            <span className="ml-2 text-dark-400">({appointment.duration} Min.)</span>
          </div>

          <div className="flex items-center text-sm text-dark-300">
            <PhoneIcon className="h-5 w-5 mr-2 text-elysViolet-500" />
            <span>{appointment.customerPhone}</span>
          </div>

          {appointment.customerEmail && (
            <div className="flex items-center text-sm text-dark-300">
              <EnvelopeIcon className="h-5 w-5 mr-2 text-elysBlue-500" />
              <span>{appointment.customerEmail}</span>
            </div>
          )}

          {appointment.serviceName && (
            <div className="flex items-start text-sm text-dark-300">
              <span className="font-medium mr-2">Service:</span>
              <span>{appointment.serviceName}</span>
            </div>
          )}

          {appointment.notes && (
            <div className="flex items-start text-sm text-dark-300">
              <span className="font-medium mr-2">Notizen:</span>
              <span className="flex-1">{appointment.notes}</span>
            </div>
          )}
        </div>

        <div className="flex space-x-3 pt-4 border-t border-dark-600">
          <Button
            onClick={() => onReject(appointment.id)}
            variant="secondary"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            disabled={isLoading}
          >
            <XMarkIcon className="h-5 w-5 mr-2" />
            Ablehnen
          </Button>
          <Button
            onClick={() => onApprove(appointment.id)}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            <CheckIcon className="h-5 w-5 mr-2" />
            Genehmigen
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AppointmentReviewCard;

