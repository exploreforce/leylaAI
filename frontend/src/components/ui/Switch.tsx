'use client';

import * as React from 'react';
import { cn } from '@/utils';

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Switch: React.FC<SwitchProps> = ({ className, checked, onCheckedChange, onChange, ...props }) => {
  const [enabled, setEnabled] = React.useState(checked || false);

  const toggle = () => {
    const newState = !enabled;
    setEnabled(newState);

    if (onCheckedChange) {
      onCheckedChange(newState);
    }

    if (onChange) {
      // Simulate event object for compatibility
      const event = {
        target: { checked: newState },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        enabled ? 'bg-primary-600' : 'bg-gray-200',
        className
      )}
      onClick={toggle}
      role="switch"
      aria-checked={enabled}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-dark-100 shadow ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
};

export default Switch; 