'use client';
import { useEffect, useRef } from 'react';
import { ArrowUpRight, CalendarDays, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { date, time, day, month } from '../lib/format';
export function LoadingState({ label = 'Finding something good…' }) {
  return (
    <div role="status" className="loading">
      <span className="loading-line" />
      {label}
      <div className="skeleton-grid">
        {[1, 2, 3].map((n) => (
          <div className="skeleton" key={n} />
        ))}
      </div>
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="empty" role="alert">
      <AlertCircle />
      <h2>Something didn’t connect.</h2>
      <p>{error?.message || 'Please try again.'}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title = 'A little quiet here.',
  message = 'Try a different search or category.',
  href,
  action,
}) {
  return (
    <div className="empty">
      <CalendarDays size={32} strokeWidth={1} />
      <h2>{title}</h2>
      <p>{message}</p>
      {href && (
        <Link className="button" href={href}>
          {action}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function EventArt({ src, title, className = '' }) {
  return (
    <img
      className={`event-art ${className}`}
      src={src}
      alt={title ? `Artwork for ${title}` : ''}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/art/gather.svg';
      }}
    />
  );
}
export function EventCard({ event, index = 0 }) {
  return (
    <article className="event-card">
      <Link className="art-link" href={`/events/${event.slug}`}>
        <EventArt src={event.coverImage} title={event.title} />
        <span className="art-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="art-arrow">
          <ArrowUpRight size={22} />
        </span>
      </Link>
      <div className="event-card-meta">
        <span>{event.category}</span>
        <span>{event.remainingCapacity === 0 ? 'Fully booked' : 'Free entry'}</span>
      </div>
      <h3>
        <Link href={`/events/${event.slug}`}>{event.title}</Link>
      </h3>
      <div className="event-card-info">
        <span>
          {date(event.startDate)} · {time(event.startDate)}
        </span>
        <span>{event.location}</span>
      </div>
    </article>
  );
}
export function EventGrid({ events }) {
  return (
    <div className="event-grid">
      {events.map((event, index) => (
        <EventCard key={event.id} event={event} index={index} />
      ))}
    </div>
  );
}
export function EventRow({ event, dashboard = false }) {
  return (
    <div className="event-row">
      <div className="date-block">
        <strong>{day(event.startDate)}</strong>
        <span>{month(event.startDate)}</span>
      </div>
      <div className="row-title">
        <span className="eyebrow">
          {event.category} {dashboard && ` / ${event.status.toLowerCase()}`}
        </span>
        <h3>
          <Link href={dashboard ? `/dashboard/events/${event.id}/edit` : `/events/${event.slug}`}>
            {event.title}
          </Link>
        </h3>
        <p>
          {event.location} · {time(event.startDate)}
        </p>
      </div>
      <span className="row-count">
        {dashboard ? `${event.registrationCount} / ${event.capacity} registered` : 'Free entry'}
      </span>
      <Link
        className="round-link"
        aria-label={`${dashboard ? 'Manage' : 'View'} ${event.title}`}
        href={dashboard ? `/dashboard/events/${event.id}/attendees` : `/events/${event.slug}`}
      >
        <ArrowUpRight size={23} />
      </Link>
    </div>
  );
}
export function ConfirmationDialog({ open, title, children, onCancel, onConfirm, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{children}</p>
      <div className="button-row">
        <button className="button secondary" disabled={busy} onClick={onCancel}>
          Keep event
        </button>
        <button className="button accent" disabled={busy} onClick={onConfirm}>
          {busy ? 'Deleting…' : 'Delete event'}
        </button>
      </div>
    </dialog>
  );
}
