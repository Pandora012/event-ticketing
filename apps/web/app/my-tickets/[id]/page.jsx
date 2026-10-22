import { TicketDetail } from '../../../components/tickets';
export default async function Page({ params }) {
  const { id } = await params;
  return <TicketDetail id={id} />;
}
