// Scan-to-Job deep links. A job QR is always a plain HTTPS URL of the form
// `/go?s={siteId}&a={action}` (plus `&r=&b=` for a housekeeping room) — see
// PSU_QR_JobDeepLink_PRD.md. Deliberately never carries identity, a PIN, or
// a token: scanning a fridge sticker alone can never log anyone in, it can
// only tell the app which job to open once someone proves who they are on
// StaffIdGate.tsx.
//
// Flow: App.tsx calls parseDeepLink() once at boot. If the URL is `/go`
// with a recognizable job, it's saved to sessionStorage and the URL is
// replaced with `/` (so refreshing never re-triggers anything odd and the
// address bar looks clean). consumeDeepLink() reads whatever's pending —
// either what parseDeepLink() just found, or left over in sessionStorage
// from before a refresh — without removing it, so the pending job survives
// a refresh until the job is actually submitted or cancelled
// (clearDeepLink()).

export type DeepLinkAction =
  | 'fridge' | 'core' | 'clean' | 'wellness' // Food Safety Technician's daily log
  | 'room'                                   // Housekeeper's room cleaning (UN.00.65)
  | 'toilet'                                 // Bathroom Janitor's one task
  | 'laundry'                                // Laundry Staff's one task
  | 'ops_logs';                              // Food Safety Supervisor — lands on their Ops Logs tab

export interface DeepLinkJob {
  siteId: string;
  action: DeepLinkAction;
  // 'room' only
  roomId?: string;
  barak?: string;
}

const STORAGE_KEY = 'psu.deeplink';

const DEEP_LINK_ACTIONS: DeepLinkAction[] = ['fridge', 'core', 'clean', 'wellness', 'room', 'toilet', 'laundry', 'ops_logs'];

function isDeepLinkAction(value: string | null): value is DeepLinkAction {
  return value !== null && (DEEP_LINK_ACTIONS as string[]).includes(value);
}

function jobFromParams(params: URLSearchParams): DeepLinkJob | null {
  const siteId = params.get('s');
  const action = params.get('a');
  if (!siteId || !isDeepLinkAction(action)) return null; // missing/unknown `a=` — friendly dead-end, not a job
  const job: DeepLinkJob = { siteId, action };
  if (action === 'room') {
    job.roomId = params.get('r') || '';
    job.barak = params.get('b') || '';
  }
  return job;
}

function saveDeepLink(job: DeepLinkJob) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(job));
  } catch {
    // sessionStorage unavailable (private browsing, storage disabled) —
    // the job still works for the rest of this page load via React state,
    // it just won't survive a refresh.
  }
}

// Call once at app boot. If the current URL is `/go` with a job query,
// persists it and strips the query string from the address bar. Returns
// the parsed job (or null if this wasn't a `/go` hit, or `/go` was hit
// with no recognizable job).
export function parseDeepLink(): DeepLinkJob | null {
  if (typeof window === 'undefined' || window.location.pathname !== '/go') return null;
  const job = jobFromParams(new URLSearchParams(window.location.search));
  if (job) saveDeepLink(job);
  window.history.replaceState({}, '', '/');
  return job;
}

// Parses a scanned QR's raw text (an absolute URL) the same way, for the
// in-app scanner (QrScanner.tsx) — used both on the Staff ID gate and from
// inside an already-open portal to jump to a new job without a page load.
export function parseDeepLinkFromUrl(rawUrl: string): DeepLinkJob | null {
  try {
    const url = new URL(rawUrl);
    if (url.pathname !== '/go') return null;
    return jobFromParams(url.searchParams);
  } catch {
    return null; // not a URL at all — whatever the camera saw wasn't one of our QRs
  }
}

// Persists a job found via the in-app scanner, same storage as parseDeepLink.
export function setDeepLink(job: DeepLinkJob) {
  saveDeepLink(job);
}

// Reads whatever job is currently pending, without clearing it.
export function consumeDeepLink(): DeepLinkJob | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DeepLinkJob) : null;
  } catch {
    return null;
  }
}

// Call after a successful submit, or an explicit cancel — the job is done.
export function clearDeepLink() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
