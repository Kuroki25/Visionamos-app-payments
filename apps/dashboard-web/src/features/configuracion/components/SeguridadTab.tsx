'use client';

import { useState } from 'react';

import { common } from '../../../content/es/common';
import { configuracionPage } from '../../../content/es/configuracion';
import { authClient } from '../../../lib/auth/client';

const inputClass =
  'w-full rounded-control border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-(--color-fg)';

/**
 * Real password change — goes through Better Auth's own `changePassword`
 * (`lib/auth/client.ts`), not the business API: Better Auth owns
 * credentials exclusively (`docs/frontend/DASHBOARD_FRONTEND_SOURCE_OF_TRUTH.md`,
 * "Autenticación") — there is no `PATCH /users/:id/password` on the
 * business API, and there shouldn't be.
 */
export function SeguridadTab() {
  const [current, setCurrent] = useState('');
  const [next1, setNext1] = useState('');
  const [next2, setNext2] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const copy = configuracionPage.seguridad;

  async function handleSave() {
    if (!current || !next1 || !next2) {
      setError(copy.requiredError);
      setStatus('error');
      return;
    }
    if (next1 !== next2) {
      setError(copy.mismatchError);
      setStatus('error');
      return;
    }
    if (next1.length < 12) {
      setError(copy.tooShortError);
      setStatus('error');
      return;
    }

    setStatus('saving');
    setError('');
    const { error: authError } = await authClient.changePassword({ currentPassword: current, newPassword: next1 });
    if (authError) {
      setError(authError.message ?? common.genericError);
      setStatus('error');
      return;
    }
    setCurrent('');
    setNext1('');
    setNext2('');
    setStatus('saved');
  }

  return (
    <div className="max-w-[480px] rounded-card border border-(--color-border) bg-(--color-surface) p-6 shadow-card">
      <div className="mb-4 text-[16.5px] font-bold text-(--color-fg)">{copy.title}</div>
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="sec-current">
            {copy.currentLabel}
          </label>
          <input id="sec-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="sec-new1">
            {copy.newLabel}
          </label>
          <input id="sec-new1" type="password" value={next1} onChange={(e) => setNext1(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="sec-new2">
            {copy.confirmLabel}
          </label>
          <input id="sec-new2" type="password" value={next2} onChange={(e) => setNext2(e.target.value)} className={inputClass} />
        </div>
        {status === 'error' ? <p className="text-[12.5px] text-(--color-danger)">{error}</p> : null}
        {status === 'saved' ? <p className="text-[12.5px] text-(--color-success)">{copy.saved}</p> : null}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={status === 'saving'}
          className="h-[42px] w-fit rounded-control bg-(--color-accent) px-5 text-[13.5px] font-bold text-white disabled:opacity-70"
        >
          {status === 'saving' ? common.saving : copy.save}
        </button>
      </div>
    </div>
  );
}
