import { NextRequest } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tusharagrawal.in';

// Hosts allowed to call our state-changing / cost-incurring API routes.
// Anything else is a cross-site caller (e.g. someone trying to use /api/chat
// as a free Gemini proxy) and is rejected.
const ALLOWED_HOSTS = new Set<string>([
  new URL(SITE_URL).host,
  'www.tusharagrawal.in',
  'tusharagrawal.in',
  'localhost:3000',
]);

/**
 * True when the request originates from our own site. Uses the Origin header
 * (sent on cross-origin and same-origin POSTs by browsers and not spoofable by
 * page JS), falling back to Referer. Requests with neither header — typical of
 * scripted abuse — are rejected.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const source = origin || referer;
  if (!source) return false;
  try {
    return ALLOWED_HOSTS.has(new URL(source).host);
  } catch {
    return false;
  }
}
