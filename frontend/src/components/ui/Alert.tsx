import React from 'react';
import { cn } from '@/utils';
import { InformationCircleIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface AlertProps {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

const alertStyles = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  success: 'bg-green-100 text-green-800',
};

const icons = {
  info: <InformationCircleIcon className="h-5 w-5" />,
  warning: <ExclamationTriangleIcon className="h-5 w-5" />,
  error: <ExclamationTriangleIcon className="h-5 w-5" />,
  success: <CheckCircleIcon className="h-5 w-5" />,
};

const Alert: React.FC<AlertProps> = ({ type, message }) => {
  return (
    <div className={cn('p-4 rounded-md', alertStyles[type])}>
      <div className="flex">
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default Alert; 