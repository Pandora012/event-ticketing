'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight } from 'lucide-react';
import { useResource } from '../lib/hooks';
import { api } from '../lib/api';
import { categories, localInput } from '../lib/format';
import { useToast } from './providers';
import { FieldError } from './auth-form';
import { LoadingState, ErrorState, EventArt } from './ui';
const schema = z
  .object({
    title: z.string().trim().min(3, 'Use at least 3 characters.').max(140),
    slug: z
      .string()
      .min(3)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens.'),
    description: z
      .string()
      .trim()
      .min(30, 'Tell guests a little more (at least 30 characters).')
      .max(10000),
    category: z.enum(categories),
    location: z.string().trim().min(3).max(200),
    startDate: z.string().min(1, 'Choose a start time.'),
    endDate: z.string().min(1, 'Choose an end time.'),
    capacity: z.coerce.number().int().min(1).max(100000),
    coverImage: z
      .string()
      .max(1000)
      .refine(
        (value) => /^\/art\/[a-z0-9-]+\.svg$/.test(value) || /^https?:\/\/.+/.test(value),
        'Use an HTTPS image URL or a local /art/*.svg asset.',
      ),
    status: z.enum(['DRAFT', 'PUBLISHED']),
  })
  .refine((x) => new Date(x.endDate) > new Date(x.startDate), {
    message: 'End time must be after the start.',
    path: ['endDate'],
  });
export function EditEvent({ id }) {
  const { data, loading, error, refresh } = useResource(`/organizer/events/${id}`);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={refresh} />;
  return <EventForm event={data} />;
}
export function EventForm({ event }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState(null);
  const locked = event?.registrationCount > 0;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: event
      ? { ...event, startDate: localInput(event.startDate), endDate: localInput(event.endDate) }
      : {
          title: '',
          slug: '',
          description: '',
          category: 'Design',
          location: '',
          startDate: '',
          endDate: '',
          capacity: 60,
          coverImage: '/art/design.svg',
          status: 'DRAFT',
        },
  });
  const cover = watch('coverImage');
  async function submit(values) {
    setError(null);
    try {
      const body = {
        ...values,
        startDate: locked ? event.startDate : new Date(values.startDate).toISOString(),
        endDate: locked ? event.endDate : new Date(values.endDate).toISOString(),
      };
      await api(event ? `/events/${event.id}` : '/events', {
        method: event ? 'PATCH' : 'POST',
        body,
      });
      toast(
        event
          ? 'Event details saved.'
          : values.status === 'PUBLISHED'
            ? 'Your gathering is live.'
            : 'Draft saved. Keep shaping it.',
      );
      router.push('/dashboard/events');
    } catch (e) {
      setError(e);
    }
  }
  function input(name, label, type = 'text', extra = {}) {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          type={type}
          {...register(name)}
          {...extra}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
        />
        <FieldError name={name} error={errors[name]} />
      </div>
    );
  }
  return (
    <>
      <Link href="/dashboard/events" className="breadcrumb">
        ← All events
      </Link>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">
            {event ? 'Refine the details' : 'From an idea to a gathering'}
          </span>
          <h1>{event ? 'Make it yours.' : 'Set something in motion.'}</h1>
          <p>
            {event
              ? 'Keep your guests informed and your details up to date.'
              : 'Start with the essentials. You can save a draft at any time.'}
          </p>
        </div>
      </div>
      <form className="event-form" onSubmit={handleSubmit(submit)} noValidate>
        {locked && (
          <p className="form-note">
            This event has attendees. Dates and the URL are locked to protect existing tickets.
            Capacity must remain at least {event.registrationCount}.
          </p>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error.message}
            {error.fields && (
              <ul>
                {Object.entries(error.fields).flatMap(([key, messages]) =>
                  messages.map((message) => (
                    <li key={`${key}-${message}`}>
                      {key}: {message}
                    </li>
                  )),
                )}
              </ul>
            )}
          </div>
        )}
        <section className="form-section">
          <h2>01 — The idea</h2>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="title">Event title</label>
              <input
                id="title"
                {...register('title')}
                placeholder="Give your gathering a name"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
                onBlur={(e) => {
                  if (!event && !watch('slug'))
                    setValue(
                      'slug',
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, ''),
                    );
                }}
              />
              <FieldError name="title" error={errors.title} />
            </div>
            {input('slug', 'URL slug', 'text', {
              readOnly: locked,
              placeholder: 'your-event-name',
            })}
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" {...register('category')}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="description">About the event</label>
              <textarea
                id="description"
                {...register('description')}
                placeholder="What’s happening, who’s it for, and what should guests know?"
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              <FieldError name="description" error={errors.description} />
            </div>
          </div>
        </section>
        <section className="form-section">
          <h2>02 — The practical things</h2>
          <p className="fine-print" style={{ marginBottom: 20 }}>
            Enter dates in your local timezone. They are stored in UTC.
          </p>
          <div className="form-grid">
            {input('startDate', 'Starts', 'datetime-local', { readOnly: locked })}
            {input('endDate', 'Ends', 'datetime-local', { readOnly: locked })}
            {input('location', 'Venue & city', 'text', { placeholder: 'Studio name, Jakarta' })}
            {input('capacity', 'Number of places', 'number', {
              min: event?.registrationCount || 1,
              max: 100000,
            })}
          </div>
        </section>
        <section className="form-section">
          <h2>03 — First impressions</h2>
          <div className="field">
            <label htmlFor="coverImage">Cover image</label>
            <input
              id="coverImage"
              {...register('coverImage')}
              aria-invalid={!!errors.coverImage}
              aria-describedby={errors.coverImage ? 'coverImage-error' : undefined}
            />
            <FieldError name="coverImage" error={errors.coverImage} />
            <span className="fine-print">
              Use an HTTPS image URL, or select a local artwork below.
            </span>
          </div>
          <div className="button-row">
            {['design', 'sound', 'future', 'culture', 'food', 'gather'].map((art) => (
              <button
                key={art}
                type="button"
                className={`button small ${cover === `/art/${art}.svg` ? '' : 'secondary'}`}
                aria-pressed={cover === `/art/${art}.svg`}
                onClick={() => setValue('coverImage', `/art/${art}.svg`, { shouldValidate: true })}
              >
                {art}
              </button>
            ))}
          </div>
          <EventArt
            src={cover || '/art/gather.svg'}
            className="form-preview"
            title="Cover preview"
          />
        </section>
        <section className="form-section">
          <h2>04 — Ready for company?</h2>
          <div className="field">
            <label htmlFor="status">Visibility</label>
            <select id="status" {...register('status')}>
              <option value="DRAFT">Draft — only you can see it</option>
              <option value="PUBLISHED">Published — visible to everyone</option>
            </select>
            <span className="fine-print">
              Unpublishing pauses new registrations and check-in. Existing tickets stay saved.
            </span>
          </div>
        </section>
        <div className="form-actions">
          <Link className="button secondary" href="/dashboard/events">
            Cancel
          </Link>
          <button className="button accent" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : event ? 'Save changes' : 'Save event'}
            <ArrowUpRight size={18} />
          </button>
        </div>
      </form>
    </>
  );
}
