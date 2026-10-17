'use client';

import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
