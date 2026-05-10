// Origin-header CSRF check. Modern browsers reliably send Origin on
// state-changing requests; combined with SameSite=Lax cookies this defeats
// classic CSRF without needing a token round-trip.
//
// APP_URL must be set in production env. Localhost is permitted in dev.

export function assertSameOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const origin = request.headers.get('origin');
  if (!origin) return false;

  const appUrl = process.env.APP_URL;
  if (appUrl && origin === appUrl.replace(/\/$/, '')) return true;

  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost:')) return true;
    if (origin.startsWith('http://127.0.0.1:')) return true;
  }

  return false;
}
