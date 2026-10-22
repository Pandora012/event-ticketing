'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
const AuthContext = createContext(null);
const ToastContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export const useToast = () => useContext(ToastContext);
export function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [sessionError, setSessionError] = useState(null);
  const refreshUser = useCallback(async () => {
    try {
      const me = await api('/auth/me');
      setUser(me);
      setSessionError(null);
    } catch (error) {
      setUser(null);
      if (error.status !== 401) setSessionError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  const toast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, type }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 6000);
  }, []);
  return (
    <AuthContext.Provider value={{ user, setUser, loading, refreshUser, sessionError }}>
      <ToastContext.Provider value={toast}>
        {children}
        <div className="toast-stack" aria-live="polite">
          {toasts.map((item) => (
            <div className={`toast ${item.type}`} key={item.id}>
              {item.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{item.message}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setToasts((items) => items.filter((x) => x.id !== item.id))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}
export function RequireAuth({ children, organizer = false }) {
  const { user, loading, sessionError, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !user && !sessionError)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname, sessionError]);
  if (sessionError)
    return (
      <div className="empty">
        <h2>Unable to load your session</h2>
        <p>{sessionError}</p>
        <button className="button" onClick={refreshUser}>
          Try again
        </button>
      </div>
    );
  if (loading || !user)
    return (
      <div className="loading" role="status">
        Loading your workspace…
      </div>
    );
  if (organizer && user.role !== 'ORGANIZER')
    return (
      <div className="empty">
        <h1>Organizer access required.</h1>
        <p>Your attendee account can browse events and collect tickets.</p>
        <a className="button" href="/events">
          Find an event
        </a>
      </div>
    );
  return children;
}
