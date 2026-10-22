'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, Menu, X, LogOut, Ticket } from 'lucide-react';
import { useAuth, useToast } from './providers';
import { api } from '../lib/api';
export function Navbar() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      window.location.assign('/');
    } catch (e) {
      toast(e.message, 'error');
    }
  }
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link href="/" className="wordmark" aria-label="Eventify home">
          eventify<span>.</span>
        </Link>
        <button
          className="mobile-menu icon-button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-nav"
          aria-label="Main navigation"
          className={open ? 'nav-links open' : 'nav-links'}
        >
          <Link
            aria-current={pathname === '/events' ? 'page' : undefined}
            href="/events"
            onClick={() => setOpen(false)}
          >
            Discover events
          </Link>
          {user ? (
            <>
              <Link href="/my-tickets" onClick={() => setOpen(false)}>
                <Ticket size={16} /> My tickets
              </Link>
              {user.role === 'ORGANIZER' && (
                <Link className="button small" href="/dashboard" onClick={() => setOpen(false)}>
                  Organizer studio <ArrowUpRight size={16} />
                </Link>
              )}
              <button className="icon-button" onClick={logout} aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            !loading && (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link
                  href="/register?role=ORGANIZER"
                  className="button small"
                  onClick={() => setOpen(false)}
                >
                  Host an event <ArrowUpRight size={16} />
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <Link href="/" className="wordmark">
        eventify<span>.</span>
      </Link>
      <p>Good things happen when we get together.</p>
      <span className="eyebrow">Independent moments. Shared.</span>
      <div className="footer-bottom">
        <span>A fictional portfolio platform. All demo events are fictional.</span>
        <Link href="/events">
          Explore the calendar <ArrowUpRight size={14} />
        </Link>
      </div>
    </footer>
  );
}
