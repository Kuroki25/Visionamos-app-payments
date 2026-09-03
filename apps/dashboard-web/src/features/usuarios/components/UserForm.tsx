'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import type { Commerce, CreateUserResponse, Portal, Role, ScopeType } from '@repo/contracts';

import { Modal } from '../../../components/ui/Modal';
import { ChevronDownIcon } from '../../../components/ui/icons';
import { common } from '../../../content/es/common';
import { roleLabels } from '../../../content/es/roles';
import { usuariosPage } from '../../../content/es/usuarios';
import { apiClient } from '../../../lib/api/client';
import { ApiError } from '../../../lib/api/errors';

export type UserFormTarget = 'create' | { id: string; fullName: string } | null;

const ROLES: Role[] = ['SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE', 'VIEWER'];

/** The scope a role is locked to, or `null` when the actor picks it (VIEWER only) — mirrors `addRoleScopeChecks` in `@repo/contracts`. */
function lockedScopeType(role: Role): ScopeType | null {
  if (role === 'SUPERADMIN') return 'GLOBAL';
  if (role === 'ADMIN_PORTAL') return 'PORTAL';
  if (role === 'ADMIN_COMMERCE') return 'COMMERCE';
  return null;
}

const selectClass =
  'w-full appearance-none rounded-control border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)';
const inputClass = selectClass;
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-(--color-fg)';
const sectionHeadingClass = 'text-[11.5px] font-bold tracking-[.04em] text-(--color-fg-faint)';

/**
 * Create/edit user — the real `User` (`@repo/contracts`) has no company/
 * cédula/teléfono/ciudad/dirección/username fields, and `PATCH /users/:id`
 * only accepts `fullName` (`UpdateUserSchema`) — role/scope changes are a
 * separate, SUPERADMIN-only endpoint (`PATCH /users/:id/role-assignment`)
 * not wired in this pass. So edit mode only has one field; create mode has
 * exactly what `CreateUserSchema` needs: email, fullName, role, and a
 * role-derived scope — reflowed into the two-section, two-column layout of
 * `docs/frontend/references/03-user-form-expected.png`, minus the fields
 * `docs/frontend/DASHBOARD_SOURCE_OF_TRUTH.md` §17.5 classified
 * `NOT_SUPPORTED` (Empresa/Cédula/Teléfono/Ciudad/Dirección) — "Empresa" in
 * that image maps onto the real Alcance/scope selector below, re-labeled
 * rather than invented. See `lib/users.ts`'s docblock for the same
 * adaptation on the read side.
 *
 * No password input: the server generates a provisional credential
 * (`CreateUserResponse.temporaryPassword`, §17.1) — shown once via
 * `CredentialReveal` below, never collected from the admin.
 */
export function UserForm({
  target,
  portals,
  commerces,
  onClose,
  onCreated,
  onSaved,
}: {
  target: UserFormTarget;
  portals: Portal[];
  commerces: Array<Commerce & { portalName: string }>;
  onClose: () => void;
  /** Fired right after a successful create, before the credential is dismissed — refresh the list, but don't close the modal yet. */
  onCreated: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = target !== null && target !== 'create';
  const copy = isEdit ? usuariosPage.editModal : usuariosPage.createModal;

  const [fullName, setFullName] = useState(isEdit ? target.fullName : '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [scopeType, setScopeType] = useState<ScopeType>('GLOBAL');
  const [scopePortalId, setScopePortalId] = useState('');
  const [scopeCommerceId, setScopeCommerceId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreateUserResponse | null>(null);

  const open = target !== null;
  const locked = lockedScopeType(role);
  const effectiveScopeType = locked ?? scopeType;

  function handleRoleChange(nextRole: Role) {
    setRole(nextRole);
    const nextLocked = lockedScopeType(nextRole);
    if (nextLocked) setScopeType(nextLocked);
  }

  function handleClose() {
    setCreated(null);
    onClose();
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (isEdit) {
      if (!fullName.trim()) {
        setError(usuariosPage.createModal.requiredError);
        return;
      }
      setSaving(true);
      setError('');
      try {
        await apiClient.patch(`/users/${target.id}`, { fullName: fullName.trim() });
        onSaved(usuariosPage.toasts.updated);
      } catch (cause) {
        setError(cause instanceof ApiError && cause.isClientError ? cause.message : common.genericError);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setError(usuariosPage.createModal.requiredError);
      return;
    }
    if (effectiveScopeType === 'PORTAL' && !scopePortalId) {
      setError(usuariosPage.createModal.scopeRequiredError);
      return;
    }
    if (effectiveScopeType === 'COMMERCE' && !scopeCommerceId) {
      setError(usuariosPage.createModal.scopeRequiredError);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const response = await apiClient.post<CreateUserResponse>('/users', {
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        scopePortalId: effectiveScopeType === 'PORTAL' ? scopePortalId : null,
        scopeCommerceId: effectiveScopeType === 'COMMERCE' ? scopeCommerceId : null,
      });
      onCreated();
      setCreated(response);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.isClientError ? cause.message : common.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} width={created ? 420 : 560}>
      {created ? (
        <CredentialReveal
          created={created}
          onDone={() => {
            setCreated(null);
            onSaved(usuariosPage.toasts.created);
          }}
        />
      ) : (
        <>
          <div className="mb-1 text-[17px] font-extrabold text-(--color-fg)">{copy.title}</div>
          <div className="mb-5 text-[13px] leading-relaxed text-(--color-fg-faint)">{copy.subtitle}</div>

          <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-4">
            {!isEdit ? <div className={sectionHeadingClass}>{usuariosPage.createModal.personalInfoHeading}</div> : null}

            <div className={isEdit ? '' : 'grid grid-cols-2 gap-4'}>
              <div>
                <label className={labelClass} htmlFor="user-fullname">
                  {copy.fullNameLabel} <span className="text-(--color-danger)">*</span>
                </label>
                <input
                  id="user-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={usuariosPage.createModal.fullNamePlaceholder}
                  className={inputClass}
                />
              </div>

              {!isEdit ? (
                <div>
                  <label className={labelClass} htmlFor="user-email">
                    {usuariosPage.createModal.emailLabel} <span className="text-(--color-danger)">*</span>
                  </label>
                  <input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={usuariosPage.createModal.emailPlaceholder}
                    className={inputClass}
                  />
                </div>
              ) : null}
            </div>

            {!isEdit ? (
              <>
                <div className={role === 'VIEWER' ? 'grid grid-cols-2 gap-4' : ''}>
                  <div>
                    <label className={labelClass} htmlFor="user-role">
                      {usuariosPage.createModal.roleLabel} <span className="text-(--color-danger)">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="user-role"
                        value={role}
                        onChange={(e) => handleRoleChange(e.target.value as Role)}
                        className={selectClass}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleLabels[r]}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-(--color-fg-faint)" />
                    </div>
                  </div>

                  {role === 'VIEWER' ? (
                    <div>
                      <label className={labelClass} htmlFor="user-scope-type">
                        {usuariosPage.createModal.scopeTypeLabel}
                      </label>
                      <div className="relative">
                        <select
                          id="user-scope-type"
                          value={scopeType}
                          onChange={(e) => setScopeType(e.target.value as ScopeType)}
                          className={selectClass}
                        >
                          {(Object.entries(usuariosPage.createModal.scopeTypeOptions) as Array<[ScopeType, string]>).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-(--color-fg-faint)" />
                      </div>
                    </div>
                  ) : null}
                </div>

                {effectiveScopeType === 'PORTAL' ? (
                  <div>
                    <label className={labelClass} htmlFor="user-portal">
                      {usuariosPage.createModal.portalLabel} <span className="text-(--color-danger)">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="user-portal"
                        value={scopePortalId}
                        onChange={(e) => setScopePortalId(e.target.value)}
                        className={selectClass}
                      >
                        <option value="">{usuariosPage.createModal.portalPlaceholder}</option>
                        {portals.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-(--color-fg-faint)" />
                    </div>
                  </div>
                ) : null}

                {effectiveScopeType === 'COMMERCE' ? (
                  <div>
                    <label className={labelClass} htmlFor="user-commerce">
                      {usuariosPage.createModal.commerceLabel} <span className="text-(--color-danger)">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="user-commerce"
                        value={scopeCommerceId}
                        onChange={(e) => setScopeCommerceId(e.target.value)}
                        className={selectClass}
                      >
                        <option value="">{usuariosPage.createModal.commercePlaceholder}</option>
                        {commerces.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.tradeName} ({c.portalName})
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-(--color-fg-faint)" />
                    </div>
                  </div>
                ) : null}

                <hr className="border-(--color-border)" />
                <div className={sectionHeadingClass}>{usuariosPage.createModal.credentialsHeading}</div>
                <div className="flex items-start gap-2.5 rounded-control bg-(--color-accent-soft) px-3.5 py-3 text-[12.5px] leading-relaxed text-(--color-accent)">
                  {usuariosPage.createModal.credentialsNotice}
                </div>
              </>
            ) : null}

            {error ? <p className="text-[12.5px] text-(--color-danger)">{error}</p> : null}

            <div className="mt-2 flex gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="h-11 flex-1 rounded-control border border-(--color-border) text-[13.5px] font-semibold text-(--color-fg) transition-colors hover:bg-(--color-surface-subtle)"
              >
                {common.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 flex-1 rounded-control bg-(--color-accent) text-[13.5px] font-bold text-white disabled:opacity-70"
              >
                {saving ? common.saving : isEdit ? common.save : common.create}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

/**
 * Shown exactly once, right after `POST /users` succeeds — the only place
 * `temporaryPassword` is ever visible (`CreateUserResponse`, §17.1). Closing
 * this view is the only way out; there is no "skip" that would silently
 * lose the credential.
 */
function CredentialReveal({ created, onDone }: { created: CreateUserResponse; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = usuariosPage.credentialModal;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context in
      // some environments) — the password is still selectable/visible below.
    }
  }

  return (
    <div>
      <div className="mb-1 text-[17px] font-extrabold text-(--color-fg)">{copy.title}</div>
      <div className="mb-5 text-[13px] leading-relaxed text-(--color-fg-faint)">{copy.subtitle}</div>

      <div className="flex flex-col gap-4">
        <div>
          <span className={labelClass}>{copy.emailLabel}</span>
          <div className="rounded-control border border-(--color-border) bg-(--color-surface-subtle) px-3.5 py-2.5 text-[13.5px] text-(--color-fg)">
            {created.email}
          </div>
        </div>

        <div>
          <span className={labelClass}>{copy.passwordLabel}</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all break-all rounded-control border border-(--color-border) bg-(--color-surface-subtle) px-3.5 py-2.5 font-mono text-[13.5px] text-(--color-fg)">
              {created.temporaryPassword}
            </code>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="h-11 shrink-0 rounded-control border border-(--color-border) px-3.5 text-[12.5px] font-semibold text-(--color-fg) hover:bg-(--color-surface-subtle)"
            >
              {copied ? copy.copied : copy.copy}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="mt-2 h-11 rounded-control bg-(--color-accent) text-[13.5px] font-bold text-white"
        >
          {copy.done}
        </button>
      </div>
    </div>
  );
}
