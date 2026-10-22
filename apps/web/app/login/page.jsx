import { Suspense } from 'react';
import { AuthForm } from '../../components/auth-form';
import { LoadingState } from '../../components/ui';
export const metadata = { title: 'Sign in' };
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuthForm />
    </Suspense>
  );
}
