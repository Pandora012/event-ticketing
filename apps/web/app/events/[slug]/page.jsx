import { EventDetail } from '../../../components/event-detail';
export default async function Page({ params }) {
  const { slug } = await params;
  return <EventDetail slug={slug} />;
}
