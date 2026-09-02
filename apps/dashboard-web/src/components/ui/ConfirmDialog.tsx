import { common } from '../../content/es/common';
import type { ConfirmState } from './use-confirm';

/** The mock's danger-icon confirm modal — reused for delete/deactivate-style confirmations. */
export function ConfirmDialog({
  confirm,
  onClose,
  onConfirm,
}: {
  confirm: ConfirmState | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!confirm) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4" onClick={onClose} role="presentation">
      <div
        className="w-full max-w-[380px] rounded-2xl bg-(--color-surface) p-6 shadow-modal"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-full bg-(--color-danger-soft)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01" stroke="var(--color-danger)" strokeWidth="2.4" strokeLinecap="round" />
            <path
              d="M10.3 3.9L2.6 17.5A1.5 1.5 0 0 0 4 19.8h16A1.5 1.5 0 0 0 21.4 17.5L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z"
              stroke="var(--color-danger)"
              strokeWidth="1.8"
              fill="none"
            />
          </svg>
        </div>
        <div className="text-base font-extrabold text-(--color-fg)">{confirm.title}</div>
        <div className="mt-2 text-[13.5px] leading-relaxed text-(--color-fg-faint)">{confirm.message}</div>
        <div className="mt-5.5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-[42px] flex-1 rounded-control border border-(--color-border) text-[13.5px] font-semibold text-(--color-fg) transition-colors hover:bg-(--color-surface-subtle)"
          >
            {common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[42px] flex-1 rounded-control bg-(--color-danger) text-[13.5px] font-bold text-white"
          >
            {confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
