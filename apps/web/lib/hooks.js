'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
export function useResource(path, full = false) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    api(path, { signal: controller.signal, full })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path, revision, full]);
  const refresh = useCallback(() => setRevision((x) => x + 1), []);
  return { ...state, refresh };
}
