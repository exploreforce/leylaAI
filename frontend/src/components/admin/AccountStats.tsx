import { CalendarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

interface AccountStatsProps {
  accountName: string;
  createdAt: string;
  totalUsers: number;
  totalAppointments: number;
}

export default function AccountStats({ accountName, createdAt, totalUsers, totalAppointments }: AccountStatsProps) {
  const { t } = useTranslation('admin');
  
  return (
    <div className="bg-dark-800 rounded-lg p-4 border border-dark-600 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{accountName}</h3>
          <p className="text-sm text-gray-700">
            {t('account_stats.created')} {moment(createdAt).format('MMM DD, YYYY')} ({moment(createdAt).fromNow()})
          </p>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-elysBlue-600" />
            <div>
              <div className="text-2xl font-bold text-elysBlue-600">{totalUsers}</div>
              <div className="text-xs text-gray-700">{t('account_stats.users')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-elysPink-600" />
            <div>
              <div className="text-2xl font-bold text-elysPink-600">{totalAppointments}</div>
              <div className="text-xs text-gray-700">{t('account_stats.appointments')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

