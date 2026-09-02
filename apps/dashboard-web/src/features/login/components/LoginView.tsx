'use client';

import { useState } from 'react';

import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoginForm } from './LoginForm';

export function LoginView() {
  const [view, setView] = useState<'login' | 'forgot'>('login');

  return view === 'login' ? (
    <LoginForm onForgotPassword={() => setView('forgot')} />
  ) : (
    <ForgotPasswordForm onBack={() => setView('login')} />
  );
}
