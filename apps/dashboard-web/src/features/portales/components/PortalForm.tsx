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
 * Create/edit portal — the real `Portal` entity is just `{ name }`
 * beyond its id/status/timestamps (`@repo/contracts`, `portals.ts`), so
 * this form has one field, not the mock's "nombre de visualización / tipo
 * de servicio / descripción / logo" (none of those exist on the real
 * entity) — see `lib/portals.ts`'s docblock.
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
        await apiClient.post('/portals', { name: name.trim() });
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
