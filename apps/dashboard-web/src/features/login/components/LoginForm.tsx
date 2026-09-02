'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { loginPage } from '../../../content/es/login';
import { signIn } from '../../../lib/auth/client';
import { translateAuthErrorMessage } from '../../../lib/auth/error-message';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full rounded-[10px] border bg-white py-3 pl-10 pr-3.5 text-sm text-[#111318] outline-none transition-[border-color,box-shadow] focus:border-[#2f6ef2] focus:ring-[3px] focus:ring-[#eaf1ff]';

/**
 * Real Better Auth login (`authClient.signIn.email`) — the actual auth
 * backend, not a mock. Built specifically to make real E2E verification of
 * Better Auth possible (there was no login UI before this).
 */
export function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const router = useRouter();
  const copy = loginPage.login;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setEmailError('');
    setLoginError('');
    if (!EMAIL_RE.test(email)) {
      setEmailError(copy.emailInvalid);
      return;
    }
    if (!password) {
      setLoginError(copy.passwordRequired);
      return;
    }

    setLoading(true);
    const { error } = await signIn.email({ email, password, rememberMe: remember });
    setLoading(false);
    if (error) {
      setLoginError(translateAuthErrorMessage(error.message) ?? copy.genericError);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <h1 className="text-[26px] font-extrabold tracking-[-0.01em] text-[#111318]">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-[#8a90a1]">{copy.subtitle}</p>

      <form className="mt-8 flex flex-col gap-4.5" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-[#111318]" htmlFor="login-email">
            {copy.emailLabel}
          </label>
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a90a1]">
              <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M4 6l8 7 8-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
                setLoginError('');
              }}
              placeholder={copy.emailPlaceholder}
              className={`${inputClass} ${emailError ? 'border-[#e0433f]' : 'border-[#e7e9ef]'}`}
            />
          </div>
          {emailError ? <p className="mt-1.5 text-xs text-[#e0433f]">{emailError}</p> : null}
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
            <label className="text-[13px] font-semibold text-[#111318]" htmlFor="login-password">
              {copy.passwordLabel}
            </label>
            <button type="button" onClick={onForgotPassword} className="text-[12.5px] font-semibold text-[#2f6ef2]">
              {copy.forgotPassword}
            </button>
          </div>
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a90a1]">
              <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V8a4 4 0 1 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLoginError('');
              }}
              placeholder={copy.passwordPlaceholder}
              className={`${inputClass} border-[#e7e9ef] pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              title="Mostrar u ocultar contraseña"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8a90a1]"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="2" fill="none" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path
                    d="M9.9 5.1A10.5 10.5 0 0 1 12 5c6 0 10 7 10 7a16.6 16.6 0 0 1-3.2 3.9M6.5 6.6C4 8.2 2 12 2 12s2.5 4.7 6.6 6.4A10.4 10.4 0 0 0 12 19c1 0 2-.15 2.9-.4"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button type="button" onClick={() => setRemember((v) => !v)} className="flex items-center gap-2 self-start">
          <span
            className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px] transition-colors"
            style={{ borderColor: remember ? '#2f6ef2' : '#c7cad1', background: remember ? '#2f6ef2' : '#fff' }}
          >
            {remember ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M4 12l6 6L20 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>
          <span className="text-[13.5px] text-[#4b5162]">{copy.remember}</span>
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex h-[46px] w-full items-center justify-center rounded-[10px] bg-[#2f6ef2] text-[14.5px] font-bold text-white disabled:opacity-85"
        >
          {loading ? copy.submitting : copy.submit}
        </button>

        {loginError ? (
          <div className="flex items-center gap-2 rounded-[9px] bg-[#fdecec] px-3.5 py-2.5 text-[13px] text-[#e0433f]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="16.3" r="1" fill="currentColor" />
            </svg>
            {loginError}
          </div>
        ) : null}
      </form>

      <div className="mt-7 text-center text-[13px] text-[#8a90a1]">
        {copy.noAccount} <span className="font-semibold text-[#2f6ef2]">{copy.contactAdmin}</span>
      </div>
    </>
  );
}
