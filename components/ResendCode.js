'use client';

import { useEffect, useState } from 'react';

/** "Resend code" link with a countdown matching the server's 60s cooldown. */
export default function ResendCode({ onResend, initialSeconds = 60 }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  async function resend() {
    setSending(true);
    try {
      const ok = await onResend();
      if (ok !== false) setSeconds(60);
    } finally {
      setSending(false);
    }
  }

  return (
    <p className="text-center text-sm text-slate-500">
      Didn&apos;t get it? Check spam, or{' '}
      {seconds > 0 ? (
        <span className="tabular-nums">resend in {seconds}s</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="font-medium text-indigo-400 underline-offset-4 hover:text-indigo-300 hover:underline disabled:opacity-60"
        >
          {sending ? 'sending…' : 'resend code'}
        </button>
      )}
    </p>
  );
}
