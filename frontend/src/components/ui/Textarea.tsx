'use client';

import * as React from 'react';
import { cn } from '@/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-dark-500 bg-dark-600 text-dark-100 px-3 py-2 text-sm shadow-sm placeholder:text-dark-300 focus:outline-none focus:ring-1 focus:ring-elysPink-500 focus:border-elysPink-500 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export default Textarea; 