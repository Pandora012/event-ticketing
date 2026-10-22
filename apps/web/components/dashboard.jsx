'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutGrid, CalendarDays, ScanLine, Plus, ArrowUpRight, Trash2 } from 'lucide-react';
import { RequireAuth, useAuth, useToast } from './providers';
import { useResource } from '../lib/hooks';
import { api } from '../lib/api';
import { date, time } from '../lib/format';
import { LoadingState, ErrorState, EmptyState, EventRow, ConfirmationDialog } from './ui';
export function DashboardShell({ children }) {
  const path = usePathname();
  return (
    <RequireAuth organizer>
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <span className="eyebrow">Organizer studio</span>
          <nav aria-label="Organizer navigation">
            {[
              ['/dashboard', 'Overview', LayoutGrid],
              ['/dashboard/events', 'Your events', CalendarDays],
              ['/dashboard/check-in', 'Check-in', ScanLine],
            ].map(([href, label, Icon]) => {
              const active = href === '/dashboard' ? path === href : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={active ? 'active' : ''}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <p className="sidebar-note">
            A little organization.
            <br />A lot of possibility.
          </p>
        </aside>
        <div className="dashboard-content">{children}</div>
      </div>
    </RequireAuth>
  );
}
export function DashboardOverview() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useResource('/organizer/dashboard');
  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">Your organizer studio</span>
          <h1>Hello, {user?.name.split(' ')[0]}.</h1>
          <p>Here’s what’s happening in your corner of Eventify.</p>
        </div>
        <Link href="/dashboard/events/new" className="button">
          <Plus size={17} />
          Create event
        </Link>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} retry={refresh} />
      ) : (
        <>
          <div className="stats-grid">
            {[
              ['Events created', data.totalEvents],
              ['Total registrations', data.totalRegistrations],
              ['Checked-in guests', data.totalCheckedIn],
            ].map(([label, value]) => (
              <div className="stat" key={label}>
                <span>{label}</span>
                <strong>{String(value).padStart(2, '0')}</strong>
              </div>
            ))}
          </div>
          <div className="section-heading">
            <h2 style={{ fontSize: 28 }}>Coming up next</h2>
            <Link href="/dashboard/events" className="text-link">
              Manage events <ArrowUpRight size={16} />
            </Link>
          </div>
          {data.upcoming.length ? (
            data.upcoming.map((event) => <EventRow key={event.id} event={event} dashboard />)
          ) : (
            <EmptyState
              title="A clean calendar. A fresh start."
              message="Bring your first idea into the room."
              href="/dashboard/events/new"
              action="Create an event"
            />
          )}
        </>
      )}
    </>
  );
}
export function OrganizerEvents() {
  const { data, loading, error, refresh } = useResource('/organizer/events');
  const toast = useToast();
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await api(`/events/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      toast('Event deleted.');
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  async function toggle(event) {
    setBusy(true);
    try {
      await api(`/events/${event.id}`, {
        method: 'PATCH',
        body: { status: event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' },
      });
      toast(
        event.status === 'PUBLISHED'
          ? 'Event unpublished. Existing tickets are preserved.'
          : 'Your event is now live.',
      );
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">Make it happen</span>
          <h1>Your events.</h1>
          <p>From the first idea to the last guest through the door.</p>
        </div>
        <Link className="button" href="/dashboard/events/new">
          <Plus size={17} />
          Create event
        </Link>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} retry={refresh} />
      ) : !data.length ? (
        <EmptyState
          title="Every gathering starts somewhere."
          message="Create a draft, work out the details, and publish when you’re ready."
          href="/dashboard/events/new"
          action="Create your first event"
        />
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Your events and registrations</caption>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Status</th>
                <th scope="col">Capacity</th>
                <th scope="col">Manage</th>
              </tr>
            </thead>
            <tbody>
              {data.map((event) => (
                <tr key={event.id}>
                  <td>
                    <strong>{event.title}</strong>
                    <small>
                      {date(event.startDate)} · {time(event.startDate)}
                    </small>
                  </td>
                  <td>
                    <span className={`badge ${event.status === 'PUBLISHED' ? 'success' : ''}`}>
                      {event.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                    <button
                      className="text-link"
                      style={{ display: 'block', marginTop: 8, fontSize: 11 }}
                      disabled={busy}
                      onClick={() => toggle(event)}
                    >
                      {event.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
                  </td>
                  <td>
                    {event.registrationCount} / {event.capacity}
                    <small>{event.remainingCapacity} places left</small>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link href={`/dashboard/events/${event.id}/edit`}>Edit</Link>
                      <Link href={`/dashboard/events/${event.id}/attendees`}>Guests</Link>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${event.title}`}
                        onClick={() => setDeleting(event)}
                        disabled={busy || event.registrationCount > 0}
                        title={
                          event.registrationCount
                            ? 'Events with registrations cannot be deleted.'
                            : 'Delete event'
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmationDialog
        open={!!deleting}
        title="Delete this gathering?"
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
      >
        “{deleting?.title}” will be permanently deleted. This action cannot be undone.
      </ConfirmationDialog>
    </>
  );
}
export function Attendees({ id }) {
  const event = useResource(`/organizer/events/${id}`);
  const attendees = useResource(`/organizer/events/${id}/attendees`);
  const [search, setSearch] = useState('');
  if (event.loading || attendees.loading) return <LoadingState />;
  if (event.error || attendees.error)
    return (
      <ErrorState
        error={event.error || attendees.error}
        retry={() => {
          event.refresh();
          attendees.refresh();
        }}
      />
    );
  const rows = attendees.data.filter((x) =>
    `${x.user.name} ${x.user.email} ${x.ticket.referenceCode}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const checkedIn = attendees.data.filter((x) => x.ticket.checkedInAt).length;
  return (
    <>
      <Link href="/dashboard/events" className="breadcrumb">
        ← All events
      </Link>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">The guest list</span>
          <h1>{event.data.title}</h1>
          <p>
            {attendees.data.length} registered · {checkedIn} checked in ·{' '}
            {event.data.remainingCapacity} places left
          </p>
        </div>
        <Link className="button" href={`/dashboard/check-in?event=${id}`}>
          <ScanLine size={18} />
          Open check-in
        </Link>
      </div>
      <div className="filters">
        <input
          aria-label="Search attendees"
          placeholder="Search by name, email, or reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="button secondary"
          onClick={() => {
            event.refresh();
            attendees.refresh();
          }}
        >
          Refresh
        </button>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Registered attendees</caption>
            <thead>
              <tr>
                <th scope="col">Guest</th>
                <th scope="col">Ticket reference</th>
                <th scope="col">Registered</th>
                <th scope="col">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.user.name}</strong>
                    <small>{row.user.email}</small>
                  </td>
                  <td>
                    <code>{row.ticket.referenceCode}</code>
                  </td>
                  <td>{date(row.createdAt)}</td>
                  <td>
                    <span className={`badge ${row.ticket.checkedInAt ? 'success' : ''}`}>
                      {row.ticket.checkedInAt ? 'Checked in' : 'Not arrived'}
                    </span>
                    {row.ticket.checkedInAt && <small>{time(row.ticket.checkedInAt)}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={search ? 'No matching guests.' : 'The list is just getting started.'}
          message={
            search
              ? 'Try a different name or ticket reference.'
              : 'Registrations will appear here as people save their place.'
          }
        />
      )}
    </>
  );
}
