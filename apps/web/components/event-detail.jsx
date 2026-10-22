'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, UserRound, Ticket } from 'lucide-react';
import { useResource } from '../lib/hooks';
import { api } from '../lib/api';
import { date, time } from '../lib/format';
import { useAuth, useToast } from './providers';
import { EventArt, LoadingState, ErrorState } from './ui';
export function EventDetail({ slug }) {
  const { data: event, loading, error, refresh } = useResource(`/events/${slug}`);
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const { data: registrations } = useResource(user ? '/registrations/me' : null);
  const existing = registrations?.find((r) => r.eventId === event?.id);
  async function register() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/events/${slug}`)}`);
      return;
    }
    setBusy(true);
    setRegistrationError('');
    try {
      const registration = await api(`/events/${event.id}/register`, { method: 'POST' });
      toast('You’re on the list. Here’s your ticket.');
      router.push(`/my-tickets/${registration.ticket.id}`);
    } catch (e) {
      setRegistrationError(e.message);
      if (['SOLD_OUT', 'REGISTRATION_CLOSED'].includes(e.code)) refresh();
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="container">
        <LoadingState />
      </div>
    );
  if (error)
    return (
      <div className="container">
        <ErrorState error={error} retry={refresh} />
      </div>
    );
  const closed = new Date(event.startDate) <= new Date();
  return (
    <div className="container">
      <Link className="breadcrumb" href="/events">
        <ArrowLeft size={15} />
        Back to the calendar
      </Link>
      <EventArt className="detail-cover" src={event.coverImage} title={event.title} />
      <div className="detail-layout">
        <div className="detail-main">
          <span className="eyebrow">
            {event.category} / An event by {event.organizer.name}
          </span>
          <h1>{event.title}</h1>
          <div className="detail-facts">
            <div className="fact">
              <CalendarDays size={20} />
              <div>
                <strong>{date(event.startDate)}</strong>
                <span>
                  {time(event.startDate)} —{' '}
                  {date(event.endDate) !== date(event.startDate) && `${date(event.endDate)} · `}
                  {time(event.endDate)} · Local time
                </span>
              </div>
            </div>
            <div className="fact">
              <MapPin size={20} />
              <div>
                <strong>{event.location}</strong>
                <span>In-person gathering</span>
              </div>
            </div>
          </div>
          <h2>About the gathering</h2>
          <p className="prose">{event.description}</p>
          <hr className="detail-divider" />
          <div className="fact">
            <UserRound size={21} />
            <div>
              <span>Hosted by</span>
              <strong>{event.organizer.name}</strong>
            </div>
          </div>
        </div>
        <aside className="booking">
          <span className="eyebrow">Your place in the room</span>
          <div className="booking-heading">
            <strong>Free</strong>
            <Ticket size={30} strokeWidth={1} />
          </div>
          <span className="fine-print">
            {event.remainingCapacity} of {event.capacity} places remaining
          </span>
          <div className="availability">
            <span
              style={{
                width: `${(100 * (event.capacity - event.remainingCapacity)) / event.capacity}%`,
              }}
            />
          </div>
          {registrationError && (
            <div role="alert" className="form-error">
              {registrationError}
            </div>
          )}
          {existing ? (
            <Link className="button accent wide" href={`/my-tickets/${existing.ticket.id}`}>
              View your ticket <ArrowUpRight size={18} />
            </Link>
          ) : (
            <button
              className="button accent wide"
              onClick={register}
              disabled={busy || closed || event.remainingCapacity === 0}
            >
              {busy
                ? 'Saving your place…'
                : closed
                  ? 'Registration closed'
                  : event.remainingCapacity === 0
                    ? 'Fully booked'
                    : user
                      ? 'Save my place'
                      : 'Sign in to register'}
              <ArrowUpRight size={18} />
            </button>
          )}
          <p>One person. One ticket. Your QR code will be ready as soon as you register.</p>
          <p>No payment required. Please bring your digital ticket to the door.</p>
        </aside>
      </div>
    </div>
  );
}
