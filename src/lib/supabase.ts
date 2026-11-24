import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use placeholder values if missing to avoid crashing on load
// The app will log warnings and fail gracefully when trying to use it
const finalUrl = supabaseUrl || 'https://placeholder-url.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

const memoryStorage = new Map<string, string>();

function setVerifierCookie(key: string, value: string) {
  if (typeof document === 'undefined') return;
  try {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; Path=/; Max-Age=600; SameSite=Lax${secureFlag}`;
  } catch (_) {}
}

function getVerifierCookie(key: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  try {
    const prefix = `${encodeURIComponent(key)}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
  } catch (_) {}
  return null;
}

function deleteVerifierCookie(key: string) {
  if (typeof document === 'undefined') return;
  try {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    document.cookie = `${encodeURIComponent(key)}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
  } catch (_) {}
}

const isPkceVerifierKey = (key: string) => key.includes('code-verifier');

// Resilient storage: mirrors ONLY the short-lived PKCE code-verifier to a SameSite=Lax cookie
// so iOS Safari/PWA/WKWebView switches (e.g. approving Gmail 2FA) do not lose the verifier.
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const fromLocal = window.localStorage.getItem(key);
      if (fromLocal !== null) return fromLocal;
    } catch (_) {}
    if (isPkceVerifierKey(key)) {
      const fromCookie = getVerifierCookie(key);
      if (fromCookie !== null) {
        try {
          window.localStorage.setItem(key, fromCookie);
        } catch (_) {}
        return fromCookie;
      }
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    memoryStorage.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {}
    if (isPkceVerifierKey(key)) {
      setVerifierCookie(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    memoryStorage.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch (_) {}
    if (isPkceVerifierKey(key)) {
      deleteVerifierCookie(key);
    }
  }
};

// In-process promise lock queue replacing navigator.locks, which can deadlock on iOS WebKit/PWA
// after backgrounding the app to approve Google 2FA in Gmail.
const inProcessLocks = new Map<string, Promise<any>>();
const iosSafeAuthLock = async <R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> => {
  const prev = inProcessLocks.get(name) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.then(() => current);
  inProcessLocks.set(name, chained);
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (inProcessLocks.get(name) === chained) {
      inProcessLocks.delete(name);
    }
  }
};

const isPlaceholderUrl = !supabaseUrl || supabaseUrl === 'https://placeholder-url.supabase.co';

const resilientFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request)?.url || '';

  if (isPlaceholderUrl || urlStr.includes('placeholder-url.supabase.co')) {
    return new Response(
      JSON.stringify({ message: 'Supabase not configured', error: 'Service Unavailable' }),
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new Response(
      JSON.stringify({ message: 'Device is offline', error: 'Service Unavailable', code: 'NETWORK_OFFLINE' }),
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
    );
  }

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const isAuthTokenCall = urlStr.includes('/auth/v1/token');

  try {
    return await fetch(input, init);
  } catch (err: any) {
    // Retry once on transport-level failures (e.g. stale iOS TCP socket after returning from Gmail 2FA)
    // for idempotent GET/HEAD requests and auth token requests that never reached the server.
    if ((method === 'GET' || method === 'HEAD' || isAuthTokenCall) && !init?.signal?.aborted) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 450));
        return await fetch(input, init);
      } catch (_) {
        // Fall through to synthetic 503 response
      }
    }

    // Return a 503 response (recognized by @supabase/auth-js NETWORK_ERROR_CODES)
    // so Supabase preserves the local session and avoids logging uncaught TypeError: Failed to fetch
    return new Response(
      JSON.stringify({
        message: err?.message || 'Network request failed',
        error: 'Service Unavailable',
        code: 'NETWORK_ERROR'
      }),
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: customStorage,
    flowType: 'pkce',
    persistSession: true,
    // Handled explicitly in a single-flight callback handler to prevent double exchangeCodeForSession 400s
    detectSessionInUrl: false,
    autoRefreshToken: true,
    lock: iosSafeAuthLock
  },
  global: {
    fetch: resilientFetch
  }
});

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder-url.supabase.co';

