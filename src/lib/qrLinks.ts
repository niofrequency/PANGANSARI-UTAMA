// Builds the actual URLs printed as QR codes (Admin's Print QR panel) —
// the exact same shape parsed by deepLink.ts on the other end. Keeping the
// URL construction in one place means the printed codes and the parser can
// never drift apart.

// Every one of these is site-less by design — one QR per action, printed
// once, works at every site (see deepLink.ts's file header for why: the
// site comes from whoever scans it, not the sticker). 'room' is the one
// exception, since a room is a physical place — see buildRoomJobUrl.
export type SimpleJobAction = 'fridge' | 'core' | 'clean' | 'wellness' | 'toilet' | 'laundry' | 'ops_logs';

export function buildSimpleJobUrl(action: SimpleJobAction): string {
  const params = new URLSearchParams({ a: action });
  return `${window.location.origin}/go?${params.toString()}`;
}

export function buildRoomJobUrl(siteId: string, barak: string, roomId: string): string {
  const params = new URLSearchParams({ s: siteId, a: 'room', r: roomId, b: barak });
  return `${window.location.origin}/go?${params.toString()}`;
}
