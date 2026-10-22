import { Suspense } from 'react';
import { CheckIn } from '../../../components/scanner';
import { LoadingState } from '../../../components/ui';
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckIn />
    </Suspense>
  );
}
