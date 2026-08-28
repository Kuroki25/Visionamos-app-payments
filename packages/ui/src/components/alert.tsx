import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
}

const TONE_CLASSES: Record<AlertTone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
  danger:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
};

export function Alert({ tone = 'info', title, className, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('rounded-md border px-4 py-3 text-sm', TONE_CLASSES[tone], className)}
      {...props}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
