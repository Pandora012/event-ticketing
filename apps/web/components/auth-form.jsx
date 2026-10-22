'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth, useToast } from './providers';
const login = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});
const signup = login.extend({
  name: z.string().trim().min(2, 'Enter at least two characters.').max(80),
  password: z
    .string()
    .min(10, 'Use at least 10 characters.')
    .max(72, 'Use no more than 72 characters.'),
  role: z.enum(['USER', 'ORGANIZER']),
});
export function AuthForm({ registering = false }) {
  const params = useSearchParams();
  const router = useRouter();
  const { setUser } = useAuth();
  const toast = useToast();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registering ? signup : login),
    defaultValues: { role: params.get('role') === 'ORGANIZER' ? 'ORGANIZER' : 'USER' },
  });
  const next = params.get('next');
  const destination =
    next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : null;
  async function submit(values) {
    setError('');
    try {
      const user = await api(`/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        body: values,
      });
      setUser(user);
      toast(registering ? 'Welcome to Eventify.' : `Good to see you, ${user.name.split(' ')[0]}.`);
      router.push(destination || (user.role === 'ORGANIZER' ? '/dashboard' : '/events'));
    } catch (e) {
      setError(e.message);
    }
  }
  const field = (name, label, type, autoComplete, placeholder) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        {...register(name)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      <FieldError name={name} error={errors[name]} />
    </div>
  );
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <span className="eyebrow">A good reason to show up.</span>
        <div>
          <h1>
            Less scrolling.
            <br />
            <span>More living.</span>
          </h1>
          <p>Meet your people. Find your thing. Make a little room for the unexpected.</p>
        </div>
        <div className="auth-symbol" aria-hidden="true">
          ↗ ↗ ↗
        </div>
        <span className="eyebrow">Independent moments. Shared.</span>
      </div>
      <div className="auth-panel">
        <h2>{registering ? 'Make yourself at home.' : 'Good to see you again.'}</h2>
        <p>
          {registering
            ? 'Your next good thing starts here.'
            : 'Sign in for your tickets and the moments ahead.'}
        </p>
        <form onSubmit={handleSubmit(submit)} noValidate>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {registering && field('name', 'Your name', 'text', 'name', 'How should we call you?')}
          {field('email', 'Email address', 'email', 'email', 'you@example.com')}
          {field(
            'password',
            'Password',
            'password',
            registering ? 'new-password' : 'current-password',
            registering ? 'At least 10 characters' : 'Your password',
          )}
          {registering && (
            <div className="field">
              <label htmlFor="role">I’m here to</label>
              <select id="role" {...register('role')}>
                <option value="USER">Discover events & attend</option>
                <option value="ORGANIZER">Host events & attend</option>
              </select>
              <span className="fine-print">
                Hosts can create events and manage their own guest lists.
              </span>
            </div>
          )}
          <button className="button accent wide" disabled={isSubmitting}>
            {isSubmitting ? 'One moment…' : registering ? 'Create my account' : 'Sign in'}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <p className="form-foot">
          {registering ? 'Already part of the crowd?' : 'New around here?'}{' '}
          <Link
            href={`${registering ? '/login' : '/register'}${destination ? `?next=${encodeURIComponent(destination)}` : ''}`}
          >
            {registering ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}
export function FieldError({ name, error }) {
  return error ? (
    <span className="field-error" id={`${name}-error`} role="alert">
      {error.message}
    </span>
  ) : null;
}
