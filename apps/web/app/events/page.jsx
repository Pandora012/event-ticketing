import { Suspense } from 'react';
import { Events } from '../../components/discovery';
import { LoadingState } from '../../components/ui';
export const metadata = { title: 'Discover events' };
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Events />
    </Suspense>
  );
}
