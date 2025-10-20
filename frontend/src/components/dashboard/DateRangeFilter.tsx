'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DateRangeFilterProps {
  onFilterChange: (startDate: string, endDate: string) => void;
}

export default function DateRangeFilter({ onFilterChange }: DateRangeFilterProps) {
  const { t } = useTranslation('dashboard');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handlePreset = (preset: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date();
    const start = new Date();
    
    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        break;
    }
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];
    
    setStartDate(startStr);
    setEndDate(endStr);
    onFilterChange(startStr, endStr);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    onFilterChange('', '');
  };

  const handleApply = () => {
    onFilterChange(startDate, endDate);
  };

  return (
    <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => handlePreset('today')}
            className="px-3 py-1 text-sm bg-dark-700 hover:bg-dark-600 text-gray-300 rounded transition-colors"
          >
            {t('filters.today')}
          </button>
          <button
            onClick={() => handlePreset('week')}
            className="px-3 py-1 text-sm bg-dark-700 hover:bg-dark-600 text-gray-300 rounded transition-colors"
          >
            {t('filters.last_7_days')}
          </button>
          <button
            onClick={() => handlePreset('month')}
            className="px-3 py-1 text-sm bg-dark-700 hover:bg-dark-600 text-gray-300 rounded transition-colors"
          >
            {t('filters.last_month')}
          </button>
          <button
            onClick={() => handlePreset('year')}
            className="px-3 py-1 text-sm bg-dark-700 hover:bg-dark-600 text-gray-300 rounded transition-colors"
          >
            {t('filters.last_year')}
          </button>
        </div>
        
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-400">{t('filters.from')}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1 bg-dark-700 border border-dark-600 rounded text-gray-300 text-sm focus:outline-none focus:border-elysPink-600"
          />
          <label className="text-sm text-gray-400">{t('filters.to')}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1 bg-dark-700 border border-dark-600 rounded text-gray-300 text-sm focus:outline-none focus:border-elysPink-600"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            className="px-4 py-1 text-sm bg-elysPink-600 hover:bg-elysPink-700 text-white rounded transition-colors"
          >
            {t('filters.apply')}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-1 text-sm bg-dark-700 hover:bg-dark-600 text-gray-300 rounded transition-colors"
          >
            {t('filters.clear')}
          </button>
        </div>
      </div>
    </div>
  );
}

