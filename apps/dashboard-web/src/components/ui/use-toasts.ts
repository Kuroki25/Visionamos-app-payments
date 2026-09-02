'use client';

import { useCallback, useState } from 'react';

import type { Tone } from '../../lib/tone';

export interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

const AUTO_DISMISS_MS = 3200;

/** Ports the mock's `addToast`/`toasts` state — self-contained per page, no global provider (no state-management dependency added for this). */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return { toasts, push };
}
