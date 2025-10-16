'use client';

import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { statsApi } from '@/utils/statsApi';
import { StatsFilters } from '@/types/stats';
import { useState } from 'react';

interface ExportButtonProps {
  filters?: StatsFilters;
}

export default function ExportButton({ filters }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await statsApi.exportCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-stats-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-elysBlue-600 hover:bg-elysBlue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
    >
      <ArrowDownTrayIcon className="h-5 w-5" />
      {loading ? 'Exportiere...' : 'CSV Export'}
    </button>
  );
}

