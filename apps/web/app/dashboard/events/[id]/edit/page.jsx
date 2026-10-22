import { EditEvent } from '../../../../../components/event-form';
export default async function Page({ params }) {
  const { id } = await params;
  return <EditEvent id={id} />;
}
