'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { safeRedirect } from '@/lib/redirect';
import ErrorMessage from './ErrorMessage';
import AuthShell from './AuthShell';
import { Spinner, inputClass, labelClass, primaryButton } from './ui';

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = searchParams.get('from');
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (isRegister && !form.name.trim()) return setError('Please enter your name.');
    if (!form.email.trim()) return setError('Please enter your email.');
    if (isRegister && form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        const data = await register(form.name.trim(), form.email.trim(), form.password);
        router.push(verifyHref(data.email));
      } else {
        await login(form.email.trim(), form.password);
        router.replace(safeRedirect(from));
      }
    } catch (err) {
      // Unverified account: the server already emailed a fresh code.
      if (err.data?.requiresVerification) {
        router.push(verifyHref(err.data.email));
        return;
      }
      setError(err.message);
      setSubmitting(false);
    }
  }

  function verifyHref(email) {
    const q = new URLSearchParams({ email });
    if (from) q.set('from', from);
    return `/verify-email?${q}`;
  }

  const otherHref = `${isRegister ? '/login' : '/register'}${from ? `?from=${encodeURIComponent(from)}` : ''}`;

  return (
    <AuthShell
      eyebrow={isRegister ? 'Join DevLog' : 'Members'}
      title={isRegister ? 'Create your account' : 'Welcome back'}
      subtitle={
        isRegister
          ? 'Start writing on DevLog in seconds. We’ll email you a code to confirm it’s you.'
          : 'Log in to write and manage your posts.'
      }
      footer={
        <>
          {isRegister ? 'Already have an account? ' : 'New to DevLog? '}
          <Link href={otherHref} className="font-medium text-white underline decoration-indigo-500 underline-offset-4 hover:decoration-white">
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <ErrorMessage title={isRegister ? 'Could not sign up' : 'Could not log in'} message={error} />}

        {isRegister && (
          <div>
            <label htmlFor="name" className={labelClass}>Name</label>
            <input id="name" autoComplete="name" required maxLength={60} value={form.name} onChange={update('name')} className={inputClass} />
          </div>
        )}
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} className={inputClass} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className={labelClass}>Password</label>
            {!isRegister && (
              <Link href="/forgot-password" className="text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={isRegister ? 8 : undefined}
            maxLength={72}
            value={form.password}
            onChange={update('password')}
            className={inputClass}
          />
          {isRegister && <p className="mt-2 text-xs text-slate-500">At least 8 characters.</p>}
        </div>

        <button type="submit" disabled={submitting} className={`${primaryButton} w-full py-3`}>
          {submitting && <Spinner />}
          {isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}
