import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';

import { cn } from '../cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          'rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900',
          'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40',
          'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-50',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/40',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
});
