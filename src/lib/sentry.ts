// Sentry error monitoring — full stack traces, the screen and the steps
// that led to a crash, grouped by release. Only switched on when
// VITE_SENTRY_DSN is set (Vercel → Environment Variables); otherwise this
// is a no-op and the Sentry code is never downloaded. Works alongside the
// app's own error log (lib/errorReporter.ts → Admin → App health).
//
// Privacy: no names / emails / message text are sent — only the user's
// role and anonymous id, and Sentry's default PII scrubbing stays on.
type SentryModule = typeof import('@sentry/react');
let sentry: SentryModule | null = null;
const queue: unknown[] = [];

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  import('@sentry/react').then((S) => {
    S.init({
      dsn,
      release: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
      // 10% of page loads get performance tracing — enough to spot a slow
      // screen at 1,000 users/day without a big bill.
      integrations: [S.browserTracingIntegration()],
      tracesSampleRate: 0.1,
      ignoreErrors: ['ResizeObserver loop', /^Script error\.?$/, 'AbortError'],
    });
    sentry = S;
    queue.splice(0).forEach((e) => S.captureException(e));
  }).catch(() => { /* monitoring must never break the app */ });
}

export function captureToSentry(err: unknown) {
  if (sentry) sentry.captureException(err);
  else if (import.meta.env.VITE_SENTRY_DSN && queue.length < 20) queue.push(err);
}

export function setSentryUser(id: string | undefined, role: string | undefined) {
  sentry?.setUser(id ? { id } : null);
  sentry?.setTag('role', role || 'signed-out');
}
