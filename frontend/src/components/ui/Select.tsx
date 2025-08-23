'use client';

import * as React from 'react';
import { cn } from '@/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-dark-200"
          >
            {label}
          </label>
        )}
        <select
          className={cn(
            'mt-1 block w-full pl-3 pr-10 py-2 text-base bg-dark-600 text-dark-100 border-dark-500 focus:outline-none focus:ring-elysPink-500 focus:border-elysPink-500 sm:text-sm rounded-md',
            className
          )}
          ref={ref}
          {...props}
        >
          {options && options.length > 0 ? (
            options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            <option value="">No options available</option>
          )}
        </select>
      </div>
    );
  }
);
Select.displayName = 'Select';

export default Select; 