'use client';
import Link from 'next/link';
import { ArrowUpRight, ArrowLeft, Printer, Copy } from 'lucide-react';
import { useResource } from '../lib/hooks';
import { date, time } from '../lib/format';
import { RequireAuth, useToast } from './providers';
import { LoadingState, ErrorState, EmptyState, EventArt } from './ui';
export function Tickets() {
  return (
    <RequireAuth>
      <TicketList />
    </RequireAuth>
  );
}
function TicketList() {
  const { data, loading, error, refresh } = useResource('/registrations/me');
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">Your personal collection</span>
        <h1>Plans worth keeping.</h1>
        <p>Your next evening out, fresh perspective, or chance encounter. All in one place.</p>
      </header>
      {loading ? (
        <LoadingState label="Gathering your tickets…" />
      ) : error ? (
        <ErrorState error={error} retry={refresh} />
      ) : data.length ? (
        <div className="ticket-list">
          {data.map((registration) => (
            <article key={registration.id} className="ticket-card">
              <EventArt src={registration.event.coverImage} title={registration.event.title} />
              <div className="ticket-card-body">
                <span className={`badge ${registration.ticket.checkedInAt ? 'success' : ''}`}>
                  {registration.ticket.checkedInAt
                    ? 'Checked in'
                    : registration.event.status === 'DRAFT'
                      ? 'Event unpublished'
                      : new Date(registration.event.endDate) < new Date()
                        ? 'Past event'
                        : 'You’re on the list'}
                </span>
                <h2>{registration.event.title}</h2>
                <p>
                  {date(registration.event.startDate)} · {time(registration.event.startDate)}
                </p>
                <Link href={`/my-tickets/${registration.ticket.id}`} className="text-link">
                  Open ticket <ArrowUpRight size={17} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your first good thing awaits."
          message="Find an event that speaks to you. Your digital ticket will live here."
          href="/events"
          action="Find an event"
        />
      )}
    </div>
  );
}
export function TicketDetail({ id }) {
  return (
    <RequireAuth>
      <TicketView id={id} />
    </RequireAuth>
  );
}
function TicketView({ id }) {
  const { data: ticket, loading, error, refresh } = useResource(`/tickets/${id}`);
  const toast = useToast();
  if (loading)
    return (
      <div className="container">
        <LoadingState label="Preparing your ticket…" />
      </div>
    );
  if (error)
    return (
      <div className="container">
        <ErrorState error={error} retry={refresh} />
      </div>
    );
  const { event, user, createdAt } = ticket.registration;
  async function copy() {
    try {
      await navigator.clipboard.writeText(ticket.token);
      toast('Ticket code copied. Keep it private.');
    } catch {
      toast('Select and copy the code from the field below.', 'error');
    }
  }
  return (
    <div className="ticket-detail-wrap">
      <Link className="breadcrumb" href="/my-tickets">
        <ArrowLeft size={16} />
        All my tickets
      </Link>
      <div className="ticket-sheet">
        <div className="ticket-top">
          <div className="section-heading">
            <Link href="/" className="wordmark">
              eventify<span>.</span>
            </Link>
            <span className={`badge ${ticket.checkedInAt ? 'success' : ''}`}>
              {ticket.checkedInAt
                ? 'Checked in'
                : event.status === 'DRAFT'
                  ? 'Event unpublished'
                  : new Date(event.endDate) < new Date()
                    ? 'Past event'
                    : 'Valid · One entry'}
            </span>
          </div>
          <span className="eyebrow">{event.category} / Admit one</span>
          <h1>{event.title}</h1>
          <div className="ticket-facts">
            <div>
              <span className="eyebrow">When</span>
              <p>
                {date(event.startDate)} · {time(event.startDate)}
                <br />
                Times in your local timezone
              </p>
            </div>
            <div>
              <span className="eyebrow">Where</span>
              <p>{event.location}</p>
            </div>
            <div>
              <span className="eyebrow">Ticket holder</span>
              <p>{user.name}</p>
            </div>
            <div>
              <span className="eyebrow">Registered</span>
              <p>{date(createdAt)}</p>
            </div>
          </div>
        </div>
        <div className="ticket-qr">
          <img src={ticket.qrCode} alt="Your admission QR code. Show this at the door." />
          <code>{ticket.referenceCode}</code>
          <p>One ticket. One entry. Show this code at the door.</p>
          {event.status === 'DRAFT' && (
            <p role="status">
              This event is currently unpublished. Check-in is paused; contact the host before
              attending.
            </p>
          )}
          {ticket.checkedInAt && (
            <p>
              Checked in {date(ticket.checkedInAt)} at {time(ticket.checkedInAt)}
            </p>
          )}
          <details className="print-hide">
            <summary>Camera not working? Use your manual code.</summary>
            <label className="field-label" htmlFor="ticket-token">
              Private validation code
            </label>
            <textarea
              id="ticket-token"
              value={ticket.token}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <button className="button secondary small" onClick={copy}>
              <Copy size={15} />
              Copy code
            </button>
            <p>Keep this code private. Anyone with it can use your ticket.</p>
          </details>
        </div>
      </div>
      <div className="button-row print-hide" style={{ marginTop: 24 }}>
        <button className="button secondary" onClick={() => window.print()}>
          <Printer size={17} />
          Print / save as PDF
        </button>
        <button className="text-link" onClick={refresh}>
          Refresh status
        </button>
      </div>
    </div>
  );
}
