// Builds the actual URLs printed as QR codes (Admin's Print QR panel) —
// the exact same shape parsed by deepLink.ts on the other end. Keeping the
// URL construction in one place means the printed codes and the parser can
// never drift apart.

export type TechnicianJobAction = 'fridge' | 'core' | 'clean' | 'wellness';

export function buildTechnicianJobUrl(action: TechnicianJobAction, siteId: string): string {
  const params = new URLSearchParams({ s: siteId, a: action });
  return `${window.location.origin}/go?${params.toString()}`;
}

export function buildRoomJobUrl(siteId: string, barak: string, roomId: string): string {
  const params = new URLSearchParams({ s: siteId, a: 'room', r: roomId, b: barak });
  return `${window.location.origin}/go?${params.toString()}`;
}
