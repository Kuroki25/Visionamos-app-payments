import { redirect } from 'next/navigation';

import { loginPage } from '../../../content/es/login';
import { LoginView } from '../../../features/login/components/LoginView';
import { getCurrentUser } from '../../../lib/auth/session.server';

/**
 * This page and its two form components intentionally use literal hex
 * colors instead of this app's `--color-*` tokens (`app/globals.css`) —
 * not a token-discipline lapse. Claude Design's login mock has no dark
 * variant at all (always the same light panel), but `.dark` on `<html>`
 * is driven by a `localStorage` preference set from *inside* the
 * dashboard (`components/layout/use-dark-mode.ts`) that outlives logging
 * out — a user who enabled dark mode, then logged out, would land back
 * here with `.dark` still applied. Using the shared tokens would make
 * this screen silently re-theme itself in a way the design never
 * specified; the literal values pin it to the one appearance that's
 * actually approved.
 */
export default async function LoginPage() {
  // Already authenticated → bounce to the real dashboard rather than
  // showing the login form again.
  const user = await getCurrentUser();
  if (user) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8f9fb] text-[#111318]">
      {/* BRAND PANEL */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-[#111318] p-12 md:flex">
        <svg width="440" height="440" viewBox="0 0 440 440" className="pointer-events-none absolute -bottom-[120px] -right-[120px] opacity-90">
          <circle cx="220" cy="220" r="220" fill="none" stroke="#232833" strokeWidth="1" />
          <circle cx="220" cy="220" r="160" fill="none" stroke="#232833" strokeWidth="1" />
          <circle cx="220" cy="220" r="100" fill="none" stroke="#2f6ef2" strokeWidth="1.5" opacity="0.4" />
        </svg>
        <div className="relative z-[1] flex items-center gap-2.5">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[#2f6ef2] text-[17px] font-extrabold text-white">
            R
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-white">{loginPage.brand.name}</div>
            <div className="text-xs font-semibold text-[#f97316]">{loginPage.brand.sub}</div>
          </div>
        </div>

        <div className="relative z-[1] max-w-[420px]">
          <div className="text-[32px] font-extrabold leading-[1.2] tracking-[-0.01em] text-white">{loginPage.hero.title}</div>
          <div className="mt-3.5 text-[15px] leading-relaxed text-[#8a8f9c]">{loginPage.hero.subtitle}</div>
        </div>

        <div className="relative z-[1] text-[12.5px] text-[#5b606e]">{loginPage.hero.copyright}</div>
      </div>

      {/* FORM PANEL */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <LoginView />
        </div>
      </div>
    </div>
  );
}
