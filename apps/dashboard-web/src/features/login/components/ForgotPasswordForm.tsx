'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { loginPage } from '../../../content/es/login';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Visually faithful to the design, honestly non-functional: no email
 * sending provider is confirmed configured in this backend
 * (`apps/api/.env` has no SMTP/email vars), so this doesn't fake the
 * mock's always-succeeds animation — it says plainly that the link
 * couldn't be sent, same honesty standard as Movimientos/Informes.
 */
export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const copy = loginPage.forgot;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'unavailable'>('idle');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError(loginPage.login.emailInvalid);
      return;
    }
    setError('');
    setStatus('unavailable');
  }

  return (
    <>
      <button type="button" onClick={onBack} className="mb-5.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#4b5162]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {copy.back}
      </button>
      <h1 className="text-[26px] font-extrabold tracking-[-0.01em] text-[#111318]">{copy.title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-[#8a90a1]">{copy.subtitle}</p>

      <form className="mt-7 flex flex-col gap-4.5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-[#111318]" htmlFor="forgot-email">
            {copy.emailLabel}
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
              setStatus('idle');
            }}
            placeholder={loginPage.login.emailPlaceholder}
            className={`w-full rounded-[10px] border bg-white px-3.5 py-3 text-sm text-[#111318] outline-none transition-[border-color,box-shadow] focus:border-[#2f6ef2] focus:ring-[3px] focus:ring-[#eaf1ff] ${error ? 'border-[#e0433f]' : 'border-[#e7e9ef]'}`}
          />
          {error ? <p className="mt-1.5 text-xs text-[#e0433f]">{error}</p> : null}
        </div>

        <button
          type="submit"
          className="flex h-[46px] w-full items-center justify-center rounded-[10px] bg-[#2f6ef2] text-[14.5px] font-bold text-white"
        >
          {copy.submit}
        </button>

        {status === 'unavailable' ? (
          <div className="rounded-[9px] bg-[#fdecec] px-3.5 py-2.5 text-[13px] text-[#e0433f]">{copy.unavailable}</div>
        ) : null}
      </form>
    </>
  );
}
