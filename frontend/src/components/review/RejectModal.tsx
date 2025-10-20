'use client';

import React, { useState } from 'react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('common');
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
              {t('reject_modal.title')}
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
            {t('reject_modal.message')} <strong className="text-dark-100">{customerName}</strong> {t('reject_modal.message_suffix')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                {t('reject_modal.reason_label')}
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reject_modal.reason_placeholder')}
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
                {t('reject_modal.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? t('reject_modal.rejecting') : t('reject_modal.reject')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;

