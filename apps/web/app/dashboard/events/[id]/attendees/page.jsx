import { Attendees } from '../../../../../components/dashboard';
export default async function Page({ params }) {
  const { id } = await params;
  return <Attendees id={id} />;
}
