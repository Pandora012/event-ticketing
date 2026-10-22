let csrfPromise;
async function csrf() {
  if (!csrfPromise)
    csrfPromise = fetch('/api/auth/csrf', { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to establish a secure session.');
        return (await res.json()).data.token;
      })
      .catch((error) => {
        csrfPromise = null;
        throw error;
      });
  return csrfPromise;
}
export class ApiError extends Error {
  constructor(error, status) {
    super(error?.message || 'Could not connect. Please try again.');
    this.code = error?.code;
    this.fields = error?.fields;
    this.status = status;
  }
}
export async function api(path, { method = 'GET', body, signal, full = false } = {}, retry = true) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrf();
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) {
    if (retry && result.error?.code === 'CSRF_REJECTED') {
      csrfPromise = null;
      return api(path, { method, body, signal, full }, false);
    }
    throw new ApiError(result.error, response.status);
  }
  if (path === '/auth/logout') csrfPromise = null;
  return full ? result : result.data;
}
