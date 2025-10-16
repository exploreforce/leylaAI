import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-700',
  green: 'from-green-500 to-green-700',
  red: 'from-red-500 to-red-700',
  yellow: 'from-yellow-500 to-yellow-700',
  purple: 'from-purple-500 to-purple-700',
};

const iconColorClasses = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
};

export default function StatsCard({ title, value, icon, trend, color = 'blue' }: StatsCardProps) {
  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 hover:border-elysPink-600 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-300 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-100 mb-2">{value}</p>
          {trend && (
            <p className="text-xs text-gray-400">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} bg-opacity-10`}>
          <div className={iconColorClasses[color]}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

