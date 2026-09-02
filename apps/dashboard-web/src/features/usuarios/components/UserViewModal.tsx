import { Modal } from '../../../components/ui/Modal';
import { CloseIcon } from '../../../components/ui/icons';
import { usuariosPage } from '../../../content/es/usuarios';
import { toneBadgeClasses, toneSoftBgClasses, toneTextClasses } from '../../../lib/tone';
import type { UserRow } from '../../../lib/users';

/** Read-only user detail — only real fields (see `lib/users.ts`'s docblock; no phone/city/lastAccess/updatedAt). */
export function UserViewModal({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  return (
    <Modal open={user !== null} onClose={onClose} width={420}>
      {user ? (
        <>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[17px] font-extrabold text-(--color-fg)">{usuariosPage.viewModal.title}</div>
              <div className="mt-0.5 text-[13px] text-(--color-fg-faint)">{usuariosPage.viewModal.subtitle}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-control-sm border border-(--color-border) text-(--color-fg-soft) hover:bg-(--color-surface-subtle)"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-4.5 flex items-center gap-3.5 rounded-control-sm bg-(--color-surface-subtle) p-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${toneSoftBgClasses[user.roleTone]} ${toneTextClasses[user.roleTone]}`}
            >
              {user.initials}
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-(--color-fg)">{user.fullName}</div>
              <div className="mt-px text-[12.5px] text-(--color-fg-faint)">{user.roleLabel}</div>
              <span
                className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${toneBadgeClasses[user.estadoTone]}`}
              >
                {user.estadoLabel}
              </span>
            </div>
          </div>

          <dl className="mt-5 flex flex-col gap-3.5">
            <Field label={usuariosPage.viewModal.email} value={user.email} />
            <Field label={usuariosPage.viewModal.role} value={user.roleLabel} />
            <Field label={usuariosPage.viewModal.scope} value={user.scopeLabel} />
            <Field label={usuariosPage.viewModal.createdAt} value={user.createdAtLabel} />
          </dl>

          <div className="mt-5 rounded-control-sm bg-(--color-surface-subtle) p-3.5">
            <dt className="text-[11px] text-(--color-fg-faint)">{usuariosPage.viewModal.userId}</dt>
            <dd className="mt-0.5 text-[13.5px] font-bold text-(--color-fg)">{user.id}</dd>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] text-(--color-fg-faint)">{label}</dt>
      <dd className="mt-0.5 text-[13.5px] font-semibold text-(--color-fg)">{value}</dd>
    </div>
  );
}
