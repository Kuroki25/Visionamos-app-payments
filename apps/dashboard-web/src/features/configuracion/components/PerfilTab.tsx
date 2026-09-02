'use client';

import { useState } from 'react';

import { common } from '../../../content/es/common';
import { configuracionPage } from '../../../content/es/configuracion';
import { apiClient } from '../../../lib/api/client';
import { ApiError } from '../../../lib/api/errors';

const inputClass =
  'w-full rounded-control border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-[13.5px] text-(--color-fg) outline-none transition-[border-color,box-shadow] focus:border-(--color-accent) focus:ring-[3px] focus:ring-(--color-accent-soft)';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-(--color-fg)';

/** Only `fullName` is real/editable here — `PATCH /users/:id` (`UpdateUserSchema`) accepts nothing else; email has no update endpoint. */
export function PerfilTab({ userId, initialFullName, email }: { userId: string; initialFullName: string; email: string }) {
  const [fullName, setFullName] = useState(initialFullName);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!fullName.trim()) {
      setError(configuracionPage.perfil.requiredError);
      setStatus('error');
      return;
    }
    setStatus('saving');
    setError('');
    try {
      await apiClient.patch(`/users/${userId}`, { fullName: fullName.trim() });
      setStatus('saved');
    } catch (cause) {
      setError(cause instanceof ApiError && cause.isClientError ? cause.message : common.genericError);
      setStatus('error');
    }
  }

  const copy = configuracionPage.perfil;

  return (
    <div className="max-w-[560px] rounded-card border border-(--color-border) bg-(--color-surface) p-6 shadow-card">
      <div className="mb-4 text-[16.5px] font-bold text-(--color-fg)">{copy.title}</div>
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="profile-name">
            {copy.fullNameLabel}
          </label>
          <input
            id="profile-name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setStatus('idle');
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="profile-email">
            {copy.emailLabel}
          </label>
          <input id="profile-email" value={email} disabled className={`${inputClass} cursor-not-allowed opacity-60`} />
          <p className="mt-1.5 text-[11.5px] text-(--color-fg-faint)">{copy.emailHint}</p>
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
