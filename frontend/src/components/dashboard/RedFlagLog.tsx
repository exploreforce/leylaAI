'use client';

import { RedFlag } from '@/types/stats';
import { FlagIcon } from '@heroicons/react/24/solid';

interface RedFlagLogProps {
  flags: RedFlag[];
}

export default function RedFlagLog({ flags }: RedFlagLogProps) {
  if (flags.length === 0) {
    return (
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <FlagIcon className="h-5 w-5 text-yellow-500" />
          Letzte Red Flags
        </h3>
        <p className="text-gray-300 text-center py-4">Keine Red Flags vorhanden</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <FlagIcon className="h-5 w-5 text-yellow-500" />
        Letzte Red Flags ({flags.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-dark-700">
            <tr>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Zeit</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Telefon</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Inhalt</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                <td className="py-3 px-3 text-sm text-gray-300">
                  {new Date(flag.timestamp).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="py-3 px-3 text-sm text-gray-300">{flag.customerPhone}</td>
                <td className="py-3 px-3 text-sm text-gray-300 max-w-md truncate">{flag.content}</td>
                <td className="py-3 px-3 text-sm">
                  <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-xs">
                    {flag.sentiment}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

