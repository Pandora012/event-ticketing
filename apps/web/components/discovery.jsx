'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, ArrowRight, Search } from 'lucide-react';
import { useResource } from '../lib/hooks';
import { categories, date } from '../lib/format';
import { EventArt, EventGrid, LoadingState, ErrorState, EmptyState, EventRow } from './ui';
export function Home() {
  const { data: events, loading, error, refresh } = useResource('/events');
  const featured = events?.[0];
  return (
    <div className="container">
      <section className="hero">
        <div className="section-topline">
          <span className="eyebrow section-label">
            <span className="dot" /> A place for getting together
          </span>
          <span className="eyebrow">Curiosity looks good on you.</span>
        </div>
        <div className="hero-heading">
          <h1>
            Find your next
            <br />
            <em>good thing.</em>
          </h1>
          <div className="hero-aside">
            <p>
              Small gatherings. Big ideas. Unforgettable evenings. Find the people and places worth
              showing up for.
            </p>
            <Link className="text-link" href="/events">
              Explore the calendar <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} retry={refresh} />
        ) : featured ? (
          <div className="feature">
            <Link
              href={`/events/${featured.slug}`}
              className="feature-art"
              aria-label={`Explore ${featured.title}`}
            >
              <EventArt src={featured.coverImage} title={featured.title} />
              <span className="art-caption">The featured gathering / Fictional edition</span>
            </Link>
            <div className="feature-content">
              <span className="eyebrow">In the spotlight — {featured.category}</span>
              <div>
                <h2>{featured.title}</h2>
                <p>{featured.description.split('\n')[0].slice(0, 160)}</p>
              </div>
              <div className="feature-meta">
                <span>{date(featured.startDate)}</span>
                <span>{featured.location.split(',')[0]}</span>
              </div>
              <Link className="text-link" href={`/events/${featured.slug}`}>
                Take a closer look <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            title="The calendar is open."
            message="The next gathering starts with an idea. Create the first event."
            href="/register?role=ORGANIZER"
            action="Become a host"
          />
        )}
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / Make room in your calendar</span>
            <h2>Worth showing up for.</h2>
          </div>
          <Link href="/events" className="text-link">
            All events <ArrowUpRight size={17} />
          </Link>
        </div>
        {events?.length > 0 && (
          <EventGrid events={events.slice(1, 4).length ? events.slice(1, 4) : events} />
        )}
      </section>
      <section className="category-section">
        <h2>
          Follow your
          <br />
          curiosity.
        </h2>
        <div className="category-links">
          {categories.map((category) => (
            <Link className="category-link" href={`/events?category=${category}`} key={category}>
              {category}
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      {events?.length > 4 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">02 / A little further ahead</span>
              <h2>On the horizon.</h2>
            </div>
          </div>
          {events.slice(4).map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </section>
      )}
      <section className="editorial-band">
        <h2>
          Have an idea?
          <br />
          Bring people into it.
        </h2>
        <div>
          <p>
            From a listening party to a room full of fresh perspectives. Make space for something of
            your own.
          </p>
          <Link href="/register?role=ORGANIZER" className="button">
            Create your first gathering <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
export function Events() {
  const params = useSearchParams();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(params.get('category') || '');
  const [upcoming, setUpcoming] = useState(true);
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const filters = new URLSearchParams({
    search: query,
    upcoming: String(upcoming),
    page: String(page),
  });
  if (category) filters.set('category', category);
  const { data, loading, error, refresh } = useResource(`/events?${filters}`, true);
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">The event calendar</span>
        <h1>Go where you’re curious.</h1>
        <p>
          Find a fresh perspective, a familiar sound, or a new favorite place. All events are free
          to attend.
        </p>
      </header>
      <div className="filters">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, places, ideas…"
            maxLength={100}
          />
        </div>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="check-label">
          <input
            type="checkbox"
            checked={upcoming}
            onChange={(e) => {
              setUpcoming(e.target.checked);
              setPage(1);
            }}
          />
          Upcoming only
        </label>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} retry={refresh} />
      ) : (
        <>
          <p className="result-count" aria-live="polite">
            {data.meta.total} {data.meta.total === 1 ? 'gathering' : 'gatherings'} to discover ·
            Times shown in your local timezone
          </p>
          {data.data.length ? (
            <EventGrid events={data.data} />
          ) : (
            <EmptyState
              title="Nothing on this frequency."
              message="Try another category or a different search. Your next good thing is out there."
            />
          )}
          {data.meta.pages > 1 && (
            <div className="pagination">
              <button
                className="button secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                {page} / {data.meta.pages}
              </span>
              <button
                className="button secondary"
                disabled={page === data.meta.pages}
                onClick={() => setPage(page + 1)}
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
