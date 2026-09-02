'use client';

import type { ReactNode } from 'react';

/**
 * Generic overlay + centered panel — ports the shape every modal in Claude
 * Design's mock shares (`portalModalOpen`/`userModalOpen`/etc.: fixed
 * backdrop, white rounded-2xl panel, `shadow-modal`). Content is passed as
 * children so each real modal (Portal form, User form, ...) only owns its
 * own fields.
 */
export function Modal({
  open,
  onClose,
  width = 460,
  children,
}: {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-2xl bg-(--color-surface) p-6 shadow-modal"
        style={{ maxWidth: width }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
