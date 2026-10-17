'use client';

import Link from 'next/link';
import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/client-api';
import { safeRedirect } from '@/lib/redirect';
import OtpInput from '@/components/OtpInput';
import ResendCode from '@/components/ResendCode';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';
import AuthShell from '@/components/AuthShell';
import { Spinner, primaryButton, secondaryButton } from '@/components/ui';

function Notice({ children }) {
  return (
    <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-2.5 text-sm text-emerald-200">
      {children}
    </p>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();
  const email = searchParams.get('email') || '';
  const from = searchParams.get('from');

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  async function submit(value = code) {
    if (inFlight.current) return;
    if (!/^\d{6}$/.test(value)) return setError('Enter all 6 digits.');
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await verifyEmail(email, value);
      router.replace(safeRedirect(from));
    } catch (err) {
      setError(err.message);
      setCode('');
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  async function resend() {
    setError('');
    setNotice('');
    try {
      await apiFetch('/api/auth/resend-otp', { method: 'POST', body: { email } });
      setNotice(`A new code was sent to ${email}.`);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  if (!email) {
    return (
      <AuthShell eyebrow="Verification" title="Missing email">
        <ErrorMessage title="Missing email" message="Start from the sign-up page so we know where to send your code." />
        <Link href="/register" className={`${secondaryButton} mt-6`}>
          Go to sign up
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="One last step"
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-medium text-white">{email}</span>. It expires in 10 minutes.
        </>
      }
      footer={
        <>
          Wrong email?{' '}
          <Link href="/register" className="font-medium text-white underline decoration-indigo-500 underline-offset-4 hover:decoration-white">
            Sign up again
          </Link>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-6"
      >
        {error && <ErrorMessage title="Verification failed" message={error} />}
        {notice && <Notice>{notice}</Notice>}
        <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={submitting} />
        <button type="submit" disabled={submitting} className={`${primaryButton} w-full py-3`}>
          {submitting && <Spinner />} Verify email
        </button>
        <ResendCode onResend={resend} />
      </form>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
