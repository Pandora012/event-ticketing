'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { useResource } from '../lib/hooks';
import { api } from '../lib/api';
import { time } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from './ui';
export function CheckIn() {
  const params = useSearchParams();
  const { data: events, loading, error, refresh } = useResource('/organizer/events');
  const [selected, setSelected] = useState(params.get('event') || '');
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraStarting, setCameraStarting] = useState(false);
  const scanner = useRef(null);
  const scanning = useRef(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (scanner.current?.isScanning) scanner.current.stop().catch(() => {});
    };
  }, []);
  async function stop() {
    if (scanner.current?.isScanning) {
      await scanner.current.stop().catch(() => {});
    }
    if (mounted.current) setCamera(false);
    scanning.current = false;
  }
  async function validate(code) {
    if (submitting.current || !code.trim() || !selected) return;
    submitting.current = true;
    setBusy(true);
    setResult(null);
    await stop();
    try {
      const data = await api('/tickets/check-in', {
        method: 'POST',
        body: { eventId: selected, token: code.trim() },
      });
      setResult({ success: true, ...data });
      setToken('');
    } catch (e) {
      setResult({ success: false, message: e.message, code: e.code });
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }
  async function start() {
    if (scanning.current) return;
    scanning.current = true;
    setCameraStarting(true);
    setCameraError('');
    setCamera(true);
    setResult(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mounted.current) {
        scanning.current = false;
        return;
      }
      scanner.current = new Html5Qrcode('qr-reader');
      await scanner.current.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => validate(decoded),
        () => {},
      );
      if (!mounted.current) await scanner.current.stop();
    } catch {
      scanning.current = false;
      if (mounted.current) {
        setCamera(false);
        setCameraError(
          'Camera unavailable. Allow camera access over HTTPS or use the manual code below.',
        );
      }
    } finally {
      if (mounted.current) setCameraStarting(false);
    }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={refresh} />;
  if (!events.length)
    return (
      <EmptyState
        title="First, a gathering."
        message="Create an event to start welcoming guests."
        href="/dashboard/events/new"
        action="Create event"
      />
    );
  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">At the door</span>
          <h1>You’re on the list.</h1>
          <p>Scan, welcome, repeat. Each ticket can only be used once.</p>
        </div>
      </div>
      <div className="field" style={{ maxWidth: 600, marginBottom: 30 }}>
        <label htmlFor="check-in-event">Choose your event</label>
        <select
          id="check-in-event"
          value={selected}
          disabled={camera || busy}
          onChange={(e) => {
            setSelected(e.target.value);
            setResult(null);
          }}
        >
          <option value="">Select an event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
              {event.status === 'DRAFT' ? ' (Draft)' : ''}
            </option>
          ))}
        </select>
        <span className="fine-print">
          Check-in opens 2 hours before the start and closes at the end. Draft events are
          ineligible.
        </span>
      </div>
      <div className="scanner-layout">
        <section className="scanner-box">
          <div id="qr-reader" style={{ display: camera ? 'block' : 'none' }} />
          {!camera && (
            <>
              <ScanLine className="scanner-icon" size={54} strokeWidth={1} />
              <h2>
                A warm welcome.
                <br />
                One quick scan.
              </h2>
              <p>Point your camera at a guest’s QR ticket. We’ll take care of the rest.</p>
            </>
          )}
          <button
            type="button"
            className="button accent"
            disabled={!selected || busy || cameraStarting}
            onClick={camera ? stop : start}
          >
            {cameraStarting ? 'Opening camera…' : camera ? 'Stop camera' : 'Start camera'}
          </button>
          {cameraError && <p role="alert">{cameraError}</p>}
        </section>
        <section className="scanner-form">
          <h2>The manual way.</h2>
          <p>
            No camera? Ask the guest for the private validation code under their ticket’s QR code.
            The short EV reference is for identification only.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              validate(token);
            }}
          >
            <div className="field">
              <label htmlFor="manual-code">Private ticket code</label>
              <textarea
                id="manual-code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ev1.…"
                required
                maxLength={200}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button className="button wide" disabled={!selected || !token.trim() || busy}>
              {busy ? 'Checking ticket…' : 'Validate & check in'}
            </button>
          </form>
        </section>
      </div>
      {result && (
        <div role="status" className={`scan-result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <>
              <CheckCircle2 size={23} />
              <h3 style={{ marginTop: 12 }}>Welcome in, {result.attendee}.</h3>
              <p>
                {result.referenceCode} · Checked in at {time(result.checkedInAt)}
              </p>
              <p>Ready for the next guest.</p>
            </>
          ) : (
            <>
              <AlertCircle size={23} />
              <h3 style={{ marginTop: 12 }}>
                {result.code === 'ALREADY_USED'
                  ? 'Already through the door.'
                  : 'Check-in not completed.'}
              </h3>
              <p>{result.message}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
