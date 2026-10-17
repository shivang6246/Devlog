'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/client-api';
import OtpInput from '@/components/OtpInput';
import ResendCode from '@/components/ResendCode';
import ErrorMessage from '@/components/ErrorMessage';
import AuthShell from '@/components/AuthShell';
import { Spinner, inputClass, labelClass, primaryButton } from '@/components/ui';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestCode(e) {
    e?.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email.');
    setBusy(true);
    try {
      const data = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setNotice(data.message);
      setStep('reset');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email.');
    if (password.length < 8) return setError('New password must be at least 8 characters.');
    setBusy(true);
    try {
      await resetPassword(email.trim(), code, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle={
        step === 'email'
          ? "Enter your account email and we'll send you a 6-digit code."
          : `Enter the code sent to ${email} and choose a new password.`
      }
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-white underline decoration-indigo-500 underline-offset-4 hover:decoration-white">
            Log in
          </Link>
        </>
      }
    >
      {step === 'email' ? (
        <form onSubmit={requestCode} noValidate className="space-y-5">
          {error && <ErrorMessage title="Couldn't send code" message={error} />}
          <div>
            <label htmlFor="email" className={labelClass}>Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoFocus />
          </div>
          <button type="submit" disabled={busy} className={`${primaryButton} w-full py-3`}>
            {busy && <Spinner />} Send reset code
          </button>
        </form>
      ) : (
        <form onSubmit={submitReset} noValidate className="space-y-5">
          {error && <ErrorMessage title="Couldn't reset password" message={error} />}
          {notice && !error && (
            <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-2.5 text-sm text-emerald-200">
              {notice}
            </p>
          )}
          <div>
            <span className={labelClass}>Code</span>
            <OtpInput value={code} onChange={setCode} disabled={busy} />
          </div>
          <div>
            <label htmlFor="newPassword" className={labelClass}>New password</label>
            <input id="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            <p className="mt-2 text-xs text-slate-500">At least 8 characters.</p>
          </div>
          <button type="submit" disabled={busy} className={`${primaryButton} w-full py-3`}>
            {busy && <Spinner />} Reset password
          </button>
          <ResendCode onResend={requestCode} />
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setError('');
            }}
            className="w-full text-center text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500 hover:text-white"
          >
            Use a different email
          </button>
        </form>
      )}
    </AuthShell>
  );
}
