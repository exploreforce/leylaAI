'use client';

import { TopCustomer } from '@/types/stats';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface TopCustomersTableProps {
  customers: TopCustomer[];
}

export default function TopCustomersTable({ customers }: TopCustomersTableProps) {
  const { t } = useTranslation('dashboard');
  
  if (customers.length === 0) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-blue-500" />
          {t('customers.top_customers')}
        </h3>
        <p className="text-gray-300 text-center py-4">{t('customers.no_customers')}</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <UserGroupIcon className="h-5 w-5 text-blue-500" />
        {t('customers.top_customers')} (Top {customers.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-dark-700">
            <tr>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">#</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">{t('customers.name')}</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">{t('common:forms.phone')}</th>
              <th className="text-right py-2 px-3 text-sm font-medium text-gray-400">{t('customers.bookings')}</th>
              <th className="text-right py-2 px-3 text-sm font-medium text-gray-400">{t('customers.revenue')}</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">{t('customers.last_visit')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr key={customer.phone} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                <td className="py-3 px-3 text-sm text-gray-300 font-semibold">#{index + 1}</td>
                <td className="py-3 px-3 text-sm text-gray-300">{customer.name}</td>
                <td className="py-3 px-3 text-sm text-gray-300">{customer.phone}</td>
                <td className="py-3 px-3 text-sm text-gray-300 text-right">{customer.bookings}</td>
                <td className="py-3 px-3 text-sm text-gray-300 text-right">
                  €{customer.totalRevenue.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-sm text-gray-300">
                  {customer.lastBooking
                    ? new Date(customer.lastBooking).toLocaleDateString('de-DE')
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

