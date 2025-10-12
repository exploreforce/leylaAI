'use client';

import React, { useState } from 'react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface RejectModalProps {
  appointmentId: string;
  customerName: string;
  onConfirm: (appointmentId: string, reason: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const RejectModal: React.FC<RejectModalProps> = ({
  appointmentId,
  customerName,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(appointmentId, reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-700 rounded-lg shadow-xl max-w-md w-full border border-dark-600">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-50">
              Termin ablehnen
            </h3>
            <button
              onClick={onCancel}
              className="text-dark-400 hover:text-dark-200 transition-colors"
              disabled={isLoading}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <p className="text-sm text-dark-300 mb-4">
            Möchten Sie den Termin für <strong className="text-dark-100">{customerName}</strong> wirklich ablehnen?
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Ablehnungsgrund (optional)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Grund für die Ablehnung des Termins..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                onClick={onCancel}
                variant="secondary"
                disabled={isLoading}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? 'Wird abgelehnt...' : 'Ablehnen'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;

