'use client';

import { useEffect } from 'react';
import ErrorMessage from '@/components/ErrorMessage';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <ErrorMessage
        title="We couldn't load this page"
        message="A server error occurred. Please try again in a moment."
        onRetry={reset}
      />
    </div>
  );
}
