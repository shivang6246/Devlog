'use client';

import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
