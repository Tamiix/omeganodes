// Shared CORS helper — restricts Access-Control-Allow-Origin to known frontends.
// Falls back to the canonical production origin for non-browser callers.

const ALLOWED_ORIGINS = new Set<string>([
  'https://omeganodes.io',
  'https://www.omeganodes.io',
  'https://omeganodes.lovable.app',
  'https://id-preview--32e6646c-cf25-4e08-90ea-f26bb5558d14.lovable.app',
]);

const ALLOWED_SUFFIXES = ['.lovable.app', '.lovableproject.com'];
const FALLBACK_ORIGIN = 'https://omeganodes.io';

export function resolveAllowedOrigin(req: Request): string {
  const origin = req.headers.get('Origin') || '';
  if (!origin) return FALLBACK_ORIGIN;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  try {
    const host = new URL(origin).hostname;
    if (ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return origin;
  } catch {
    // ignore
  }
  return FALLBACK_ORIGIN;
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
