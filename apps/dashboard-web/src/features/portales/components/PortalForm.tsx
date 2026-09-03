'use client';

import { PORTAL_LOGO_ALLOWED_MIME_TYPES, PORTAL_LOGO_MAX_BYTES } from '@repo/contracts';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Modal } from '../../../components/ui/Modal';
import { UploadIcon } from '../../../components/ui/icons';
import { common } from '../../../content/es/common';
import { portalesPage } from '../../../content/es/portales';
import { API_BASE_URL } from '../../../lib/api/config';
import { apiClient } from '../../../lib/api/client';
import { ApiError } from '../../../lib/api/errors';

export interface PortalFormTarget {
  id: string;
  name: string;
  displayName: string | null;
  serviceType: string | null;
  description: string | null;
  logoUrl: string | null;
}

const inputClass =
  'w-full rounded-control border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-(--color-fg)';

/**
 * Create/edit portal — `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §17.2.
 * `name`/`displayName`/`serviceType`/`description` are all real
 * `CreatePortalSchema` fields (`serviceType` is free text, not the closed
 * dropdown the reference image shows — no confirmed category list exists,
 * see the entity's own docblock). "Portal activo" (create only,
 * `CreatePortalSchema.status`) mirrors
 * `docs/frontend/references/06-portal-form-expected-bottom.png`'s toggle;
 * edit mode never sends `status` — `PATCH /portals/:id/status` is the only
 * audited path (`RowActionsMenu`'s Habilitar/Deshabilitar action).
 *
 * Logo: uploaded as a second request (`POST /portals/:id/logo`,
 * multipart) right after the portal itself is created/identified — the
 * Portal needs an id before a logo can belong to it. One click for the
 * admin, two real HTTP calls underneath.
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
  const [displayName, setDisplayName] = useState(isEdit ? (target.displayName ?? '') : '');
  const [serviceType, setServiceType] = useState(isEdit ? (target.serviceType ?? '') : '');
  const [description, setDescription] = useState(isEdit ? (target.description ?? '') : '');
  const [active, setActive] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const open = target !== null;
  const copy = portalesPage.modal;
  const existingLogoUrl = isEdit ? target.logoUrl : null;
  const displayedLogoSrc = logoPreviewUrl ?? (existingLogoUrl ? `${API_BASE_URL}${existingLogoUrl}` : null);

  // Revoke the object URL created for a locally-chosen file — never leak it,
  // and never revoke `existingLogoUrl` (a real API URL, not ours to revoke).
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  function acceptLogoFile(file: File): boolean {
    if (!(PORTAL_LOGO_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(copy.logoInvalidTypeError);
      return false;
    }
    if (file.size > PORTAL_LOGO_MAX_BYTES) {
      setError(copy.logoTooLargeError);
      return false;
    }
    setError('');
    setLogoFile(file);
    setLogoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    return true;
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) acceptLogoFile(file);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) acceptLogoFile(file);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    // displayName/serviceType/description are required on CREATE
    // (`CreatePortalSchema`) but stay optional on EDIT (`UpdatePortalSchema`
    // — real, not an oversight): the 3 portals seeded before this pass
    // (Avanza/Otrahuilca/Coopenjo) have none of them, and an admin must
    // still be able to rename a portal without being forced to backfill
    // fields that were never part of that edit.
    const missingRequired = isEdit
      ? !name.trim()
      : !name.trim() || !displayName.trim() || !serviceType.trim() || !description.trim();
    if (missingRequired) {
      setError(copy.requiredError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      let portalId: string;
      if (isEdit) {
        // Only send a field that has a real value — an empty string would
        // fail `UpdatePortalSchema`'s `min(1)` (still enforced when the key
        // IS present; `.partial()` only makes the *key* optional). Omitting
        // it entirely leaves whatever the portal already had untouched,
        // same as any other partial edit.
        await apiClient.patch(`/portals/${target.id}`, {
          name: name.trim(),
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
          ...(serviceType.trim() ? { serviceType: serviceType.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
        });
        portalId = target.id;
      } else {
        const created = await apiClient.post<{ id: string }>('/portals', {
          name: name.trim(),
          displayName: displayName.trim(),
          serviceType: serviceType.trim(),
          description: description.trim(),
          status: active ? 'ACTIVE' : 'INACTIVE',
        });
        portalId = created.id;
      }

      if (logoFile) {
        try {
          const formData = new FormData();
          formData.append('logo', logoFile);
          await apiClient.post(`/portals/${portalId}/logo`, formData);
        } catch {
          onSaved(copy.logoUploadError);
          return;
        }
      }

      onSaved(isEdit ? portalesPage.toasts.updated : portalesPage.toasts.created);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.isClientError ? cause.message : common.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <div className="mb-1 text-[17px] font-extrabold text-(--color-fg)">
        {isEdit ? copy.editTitle : copy.createTitle}
      </div>
      <div className="mb-5 text-[13px] text-(--color-fg-faint)">{isEdit ? copy.editSubtitle : copy.createSubtitle}</div>

      <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="portal-name">
            {copy.nameLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input
            id="portal-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={copy.namePlaceholder}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="portal-display-name">
            {copy.displayNameLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input
            id="portal-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={copy.displayNamePlaceholder}
            className={inputClass}
          />
          <p className="mt-1.5 text-[11.5px] text-(--color-fg-faint)">{copy.displayNameHint}</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="portal-service-type">
            {copy.serviceTypeLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input
            id="portal-service-type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder={copy.serviceTypePlaceholder}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="portal-description">
            {copy.descriptionLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <textarea
            id="portal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, copy.descriptionMaxLength))}
            placeholder={copy.descriptionPlaceholder}
            rows={3}
            className={`${inputClass} resize-y`}
          />
          <p className="mt-1.5 text-right text-[11.5px] text-(--color-fg-faint)">
            {description.length}/{copy.descriptionMaxLength} {copy.descriptionCounterSuffix}
          </p>
        </div>

        <hr className="border-(--color-border)" />

        <div>
          <label className={labelClass} htmlFor="portal-logo-input">
            {copy.logoLabel}
          </label>
          <input
            ref={fileInputRef}
            id="portal-logo-input"
            type="file"
            accept={PORTAL_LOGO_ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-4 py-6 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-(--color-accent-soft)"
          >
            {displayedLogoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- external/uploaded content from the API's own origin, not a static asset next/image can optimize.
              <img src={displayedLogoSrc} alt="" className="h-16 w-16 rounded-control object-cover" />
            ) : (
              <UploadIcon className="text-(--color-fg-faint)" />
            )}
            <span className="text-[13px] font-semibold text-(--color-fg)">
              {displayedLogoSrc ? copy.logoChange : copy.logoDropText}
            </span>
            <span className="text-[11.5px] text-(--color-fg-faint)">{copy.logoDropHint}</span>
          </div>
        </div>

        {!isEdit ? (
          <div className="flex items-center justify-between">
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

        {error ? <p className="text-[12.5px] text-(--color-danger)">{error}</p> : null}

        <div className="mt-2 flex gap-2.5">
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
