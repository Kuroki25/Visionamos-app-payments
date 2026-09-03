'use client';

import type { FormEvent } from 'react';
import { useId, useState } from 'react';

import type { Category } from '@repo/contracts';

import { Modal } from '../../../components/ui/Modal';
import { ChevronDownIcon } from '../../../components/ui/icons';
import { common } from '../../../content/es/common';
import { portalDetailPage } from '../../../content/es/portalDetail';
import { apiClient } from '../../../lib/api/client';
import { ApiError } from '../../../lib/api/errors';

const inputClass =
  'w-full rounded-control border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-(--color-fg)';

const EMPTY = {
  tradeName: '',
  legalName: '',
  taxId: '',
  categoryId: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  city: '',
};

/**
 * Create a Commerce (Aliado) — real fields from `CreateCommerceSchema`
 * (`@repo/contracts`), reordered to match
 * `docs/frontend/references/07-ally-form-expected-top.png`/
 * `08-ally-form-expected-bottom.png` (`docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md`
 * §17.3): visual-only change, no backend/contract touched. The image's
 * "tipo" free-text doesn't exist as such — it maps onto `categoryId` (a
 * real, portal-specific `Category` picked from
 * `GET /portals/:portalId/categories`). `legalName`/`contactName` are
 * real, backend-required fields the image doesn't show — kept, appended
 * after the fields the image does show rather than removed. `address` is
 * kept required (backend: `NOT NULL`) even though the image labels it
 * "(opcional)" — the backend is the higher authority per this document's
 * hierarchy when the two disagree.
 */
export function CommerceForm({
  open,
  portalId,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  portalId: string;
  categories: Category[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const copy = portalDetailPage.createModal;
  const uid = useId();

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (
      !form.tradeName.trim() ||
      !form.legalName.trim() ||
      !form.taxId.trim() ||
      !form.categoryId ||
      !form.contactName.trim() ||
      !form.contactEmail.trim() ||
      !form.contactPhone.trim() ||
      !form.address.trim() ||
      !form.city.trim()
    ) {
      setError(copy.requiredError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      await apiClient.post(`/portals/${portalId}/commerces`, form);
      setForm(EMPTY);
      onSaved(portalDetailPage.toasts.created);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.isClientError ? cause.message : common.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={460}>
      <div className="mb-1 text-[17px] font-extrabold text-(--color-fg)">{copy.title}</div>
      <div className="mb-5 text-[13px] text-(--color-fg-faint)">{copy.subtitle}</div>

      <form onSubmit={(e) => void handleSave(e)}>
      <div className="flex max-h-[58vh] flex-col gap-3.5 overflow-y-auto pr-0.5">
        <div className="text-[12.5px] font-bold tracking-[.03em] text-(--color-fg-faint)">{copy.generalSection}</div>
        <div>
          <label className={labelClass} htmlFor={`${uid}-tradeName`}>
            {copy.tradeNameLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input
            id={`${uid}-tradeName`}
            value={form.tradeName}
            onChange={(e) => set('tradeName', e.target.value)}
            placeholder={copy.tradeNamePlaceholder}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${uid}-categoryId`}>
            {copy.categoryLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <div className="relative">
            <select
              id={`${uid}-categoryId`}
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className={`${inputClass} appearance-none`}
            >
              <option value="">{copy.categoryPlaceholder}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-(--color-fg-faint)" />
          </div>
          {categories.length === 0 ? <p className="mt-1.5 text-[11.5px] text-(--color-danger)">{copy.noCategoriesError}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor={`${uid}-taxId`}>
            {copy.taxIdLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input
            id={`${uid}-taxId`}
            value={form.taxId}
            onChange={(e) => set('taxId', e.target.value)}
            placeholder={copy.taxIdPlaceholder}
            className={inputClass}
          />
        </div>
        {/* `legalName` is a real, backend-required field (`CreateCommerceSchema`)
            that `07-ally-form-expected-top.png` doesn't show — kept, appended
            after the 3 fields the image does show (§17.5: "EXISTS, imagen
            incompleta" — the backend manda over an incomplete reference). */}
        <div>
          <label className={labelClass} htmlFor={`${uid}-legalName`}>
            {copy.legalNameLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input
            id={`${uid}-legalName`}
            value={form.legalName}
            onChange={(e) => set('legalName', e.target.value)}
            placeholder={copy.legalNamePlaceholder}
            className={inputClass}
          />
        </div>

        <div className="border-t border-(--color-border) pt-3 text-[12.5px] font-bold tracking-[.03em] text-(--color-fg-faint)">
          {copy.contactSection}
        </div>
        <div>
          <label className={labelClass} htmlFor={`${uid}-contactEmail`}>
            {copy.contactEmailLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input
            id={`${uid}-contactEmail`}
            type="email"
            value={form.contactEmail}
            onChange={(e) => set('contactEmail', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${uid}-contactPhone`}>
            {copy.contactPhoneLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input id={`${uid}-contactPhone`} value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${uid}-city`}>
            {copy.cityLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input id={`${uid}-city`} value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
        </div>
        <div>
          {/* Backend requires `address` (`NOT NULL`) — the reference image
              labels it "(opcional)", but the backend manda per this
              document's authority hierarchy (§17.5: "El backend manda: se
              mantiene requerida; la imagen se equivoca en esa etiqueta"). */}
          <label className={labelClass} htmlFor={`${uid}-address`}>
            {copy.addressLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input id={`${uid}-address`} value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
        </div>
        {/* `contactName` — same reasoning as `legalName` above: real,
            required, absent from the image. */}
        <div>
          <label className={labelClass} htmlFor={`${uid}-contactName`}>
            {copy.contactNameLabel} <span className="text-(--color-danger)">*</span>
          </label>
          <input id={`${uid}-contactName`} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} className={inputClass} />
        </div>

        {error ? <p className="text-[12.5px] text-(--color-danger)">{error}</p> : null}
      </div>

      <div className="mt-5.5 flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="h-11 flex-1 rounded-control border border-(--color-border) text-[13.5px] font-semibold text-(--color-fg) transition-colors hover:bg-(--color-surface-subtle)"
        >
          {common.cancel}
        </button>
        <button
          type="submit"
          disabled={saving || categories.length === 0}
          className="h-11 flex-1 rounded-control bg-(--color-accent) text-[13.5px] font-bold text-white disabled:opacity-70"
        >
          {saving ? common.saving : common.create}
        </button>
      </div>
      </form>
    </Modal>
  );
}
