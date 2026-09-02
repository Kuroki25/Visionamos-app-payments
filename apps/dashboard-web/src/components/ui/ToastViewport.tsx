import { toneSolidBgClasses } from '../../lib/tone';
import type { ToastItem } from './use-toasts';

export function ToastViewport({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-120 flex flex-col gap-2.5">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="flex min-w-[240px] items-center gap-2.5 rounded-control border border-(--color-border) bg-(--color-surface) px-4 py-3 text-[13.5px] font-semibold text-(--color-fg) shadow-toast"
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${toneSolidBgClasses[toast.tone]}`} />
          {toast.message}
        </div>
      ))}
    </div>
  );
}
