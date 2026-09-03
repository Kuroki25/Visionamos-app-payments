'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import type { Commerce, Portal, Role } from '@repo/contracts';

import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PlusIcon, SearchIcon } from '../../../components/ui/icons';
import { RowActionsMenu } from '../../../components/ui/RowActionsMenu';
import { ToastViewport } from '../../../components/ui/ToastViewport';
import { useConfirm } from '../../../components/ui/use-confirm';
import { useToasts } from '../../../components/ui/use-toasts';
import { roleLabels } from '../../../content/es/roles';
import { usuariosPage } from '../../../content/es/usuarios';
import { apiClient } from '../../../lib/api/client';
import { toneBadgeClasses, toneSolidBgClasses } from '../../../lib/tone';
import type { RoleCount, UserRow } from '../../../lib/users';
import { RoleCountTiles } from './RoleCountTiles';
import { UserForm, type UserFormTarget } from './UserForm';
import { UserViewModal } from './UserViewModal';

const ROLE_FILTERS: Role[] = ['SUPERADMIN', 'ADMIN_PORTAL', 'ADMIN_COMMERCE', 'VIEWER'];

export function UsersExplorer({
  roleCounts,
  rows,
  portals,
  commerces,
}: {
  roleCounts: RoleCount[];
  rows: UserRow[];
  portals: Portal[];
  commerces: Array<Commerce & { portalName: string }>;
}) {
  const router = useRouter();
  const { toasts, push } = useToasts();
  const { confirm, ask, close: closeConfirm, confirmAction } = useConfirm();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [formTarget, setFormTarget] = useState<UserFormTarget>(null);
  const [viewedUser, setViewedUser] = useState<UserRow | null>(null);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (roleFilter === 'ALL' || r.roleLabel === roleLabels[roleFilter]) &&
        (r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)),
    );
  }, [rows, search, roleFilter]);

  function handleSaved(message: string) {
    setFormTarget(null);
    push(message, 'success');
    router.refresh();
  }

  async function doToggleActive(row: UserRow, enabling: boolean) {
    try {
      await apiClient.patch(`/users/${row.id}/status`, { status: enabling ? 'ACTIVE' : 'INACTIVE' });
      push(enabling ? usuariosPage.toasts.enabled : usuariosPage.toasts.disabled, 'success');
      router.refresh();
    } catch {
      push('No se pudo actualizar el usuario.', 'danger');
    }
  }

  function toggleActive(row: UserRow) {
    const enabling = row.estadoTone !== 'success';
    const copy = enabling ? usuariosPage.confirmEnable : usuariosPage.confirmDisable;
    ask(
      copy.title,
      `${copy.messagePrefix}${row.fullName}${copy.messageSuffix}`,
      enabling ? usuariosPage.menu.enable : usuariosPage.menu.disable,
      () => void doToggleActive(row, enabling),
    );
  }

  return (
    <>
      <RoleCountTiles counts={roleCounts} />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-fg-faint)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={usuariosPage.searchPlaceholder}
            className="w-full rounded-control border border-(--color-border) bg-(--color-surface) py-2.5 pl-[38px] pr-3.5 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRoleFilter('ALL')}
            className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-[12.5px] font-semibold ${
              roleFilter === 'ALL'
                ? 'border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)'
                : 'border-(--color-border) text-(--color-fg-soft)'
            }`}
          >
            {usuariosPage.filterAll}
          </button>
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-[12.5px] font-semibold ${
                roleFilter === role
                  ? 'border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)'
                  : 'border-(--color-border) text-(--color-fg-soft)'
              }`}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormTarget('create')}
          className="flex h-11 items-center gap-2 whitespace-nowrap rounded-control bg-(--color-accent) px-4.5 text-[13.5px] font-bold text-white"
        >
          <PlusIcon /> {usuariosPage.newUser}
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-(--color-border) bg-(--color-surface) shadow-card">
        <div className="grid grid-cols-[2fr_2fr_1fr_90px] gap-3 border-b border-(--color-border) px-5 py-3 text-[11.5px] font-bold tracking-[.04em] text-(--color-fg-faint)">
          <div>{usuariosPage.columns.usuario}</div>
          <div>{usuariosPage.columns.contacto}</div>
          <div>{usuariosPage.columns.rol}</div>
          <div>{usuariosPage.columns.acciones}</div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13.5px] text-(--color-fg-faint)">{usuariosPage.empty}</div>
        ) : (
          filteredRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[2fr_2fr_1fr_90px] items-center gap-3 border-b border-(--color-border) px-5 py-3 last:border-b-0 hover:bg-(--color-surface-subtle)"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold text-white ${toneSolidBgClasses[row.roleTone]}`}
                >
                  {row.initials}
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-(--color-fg)">{row.fullName}</div>
                  <div className="text-xs text-(--color-fg-faint)">{row.scopeLabel}</div>
                </div>
              </div>
              <div className="text-[13px] text-(--color-fg)">{row.email}</div>
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${toneBadgeClasses[row.roleTone]}`}>
                  {row.roleLabel}
                </span>
              </div>
              <RowActionsMenu
                label={usuariosPage.columns.acciones}
                actions={[
                  { key: 'view', label: usuariosPage.menu.view, onSelect: () => setViewedUser(row) },
                  {
                    key: 'edit',
                    label: usuariosPage.menu.edit,
                    onSelect: () => setFormTarget({ id: row.id, fullName: row.fullName }),
                  },
                  {
                    key: 'toggle',
                    label: row.estadoTone === 'success' ? usuariosPage.menu.disable : usuariosPage.menu.enable,
                    tone: 'warning',
                    onSelect: () => toggleActive(row),
                  },
                ]}
              />
            </div>
          ))
        )}
      </div>

      <UserForm
        target={formTarget}
        portals={portals}
        commerces={commerces}
        onClose={() => setFormTarget(null)}
        onCreated={() => router.refresh()}
        onSaved={handleSaved}
      />
      <UserViewModal user={viewedUser} onClose={() => setViewedUser(null)} />
      <ConfirmDialog confirm={confirm} onClose={closeConfirm} onConfirm={confirmAction} />
      <ToastViewport toasts={toasts} />
    </>
  );
}
