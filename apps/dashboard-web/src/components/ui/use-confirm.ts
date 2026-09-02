'use client';

import { useCallback, useState } from 'react';

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

/** Ports the mock's `openConfirm`/`confirm`/`confirmAction` state for a destructive-action dialog. */
export function useConfirm() {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const ask = useCallback((title: string, message: string, confirmLabel: string, onConfirm: () => void) => {
    setConfirm({ title, message, confirmLabel, onConfirm });
  }, []);
  const close = useCallback(() => setConfirm(null), []);
  const confirmAction = useCallback(() => {
    confirm?.onConfirm();
    setConfirm(null);
  }, [confirm]);

  return { confirm, ask, close, confirmAction };
}
