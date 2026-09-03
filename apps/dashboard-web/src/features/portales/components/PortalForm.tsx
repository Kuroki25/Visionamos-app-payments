'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { common } from '../../../content/es/common';
import { portalesPage } from '../../../content/es/portales';
import { apiClient } from '../../../lib/api/client';
import { ApiError } from '../../../lib/api/errors';
import { Modal } from '../../../components/ui/Modal';

export interface PortalFormTarget {
  id: string;
  name: string;
}

/**
 * Create/edit portal — the real `Portal` entity is just
 * `{ name, status }` beyond its id/timestamps (`@repo/contracts`,
 * `portals.ts`), so this form has two real fields, not the mock's "nombre
 * de visualización / tipo de servicio / descripción / logo"
 * (`docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §17.5: confirmed
 * `BACKEND_GAP` without a business decision, deliberately not built) —
 * see `lib/portals.ts`'s docblock. "Portal activo" (create only —
 * `CreatePortalSchema.status`, optional, defaults to `ACTIVE`) mirrors
 * `docs/frontend/references/06-portal-form-expected-bottom.png`'s toggle.
 * Edit mode never sends `status`: `UpdatePortalSchema` omits it on
 * purpose, `PATCH /portals/:id/status` is the only audited path
 * (`RowActionsMenu`'s Habilitar/Deshabilitar action).
 */
export function PortalForm({
  target,
  onClose,
  onSaved,
}: {
  target: PortalFormTarget | 'create' | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = target !== null && target !== 'create';
  const [name, setName] = useState(isEdit ? target.name : '');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const open = target !== null;
  const copy = portalesPage.modal;

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(copy.requiredError);
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await apiClient.patch(`/portals/${target.id}`, { name: name.trim() });
        onSaved(portalesPage.toasts.updated);
      } else {
        await apiClient.post('/portals', { name: name.trim(), status: active ? 'ACTIVE' : 'INACTIVE' });
        onSaved(portalesPage.toasts.created);
      }
    } catch (cause) {
      setError(cause instanceof ApiError && cause.isClientError ? cause.message : common.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="mb-1 text-[17px] font-extrabold text-(--color-fg)">
        {isEdit ? copy.editTitle : copy.createTitle}
      </div>
      <div className="mb-5 text-[13px] text-(--color-fg-faint)">{isEdit ? copy.editSubtitle : copy.createSubtitle}</div>

      <form onSubmit={(e) => void handleSave(e)}>
        <label className="mb-1.5 block text-[13px] font-semibold text-(--color-fg)" htmlFor="portal-name">
          {copy.nameLabel} <span className="text-(--color-danger)">*</span>
        </label>
        <input
          id="portal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={copy.namePlaceholder}
          className="w-full rounded-control border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)"
        />
        {!isEdit ? (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-(--color-fg)">{copy.activeLabel}</span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={copy.activeLabel}
              onClick={() => setActive((v) => !v)}
              className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-(--color-accent-soft)"
              style={{ background: active ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                style={{ transform: active ? 'translateX(18px)' : 'translateX(3px)' }}
              />
            </button>
          </div>
        ) : null}

        {error ? <p className="mt-2 text-[12.5px] text-(--color-danger)">{error}</p> : null}

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-control border border-(--color-border) text-[13.5px] font-semibold text-(--color-fg) transition-colors hover:bg-(--color-surface-subtle)"
          >
            {common.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-11 flex-1 rounded-control bg-(--color-accent) text-[13.5px] font-bold text-white disabled:opacity-70"
          >
            {saving ? common.saving : common.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}
