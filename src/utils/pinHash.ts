// Hashes a Staff ID PIN before it's ever written to Firestore.
//
// This is a deterrent, not real security — be honest with yourself about
// that before relying on it. A 4-digit PIN is only 10,000 possibilities,
// and firestore.rules deliberately allows a public `get` on users/{email}
// (see that file — loginOrRegister() has to read a profile before the
// person is authenticated, the same reason loginByStaffCode needs it
// here). So anyone who can reach the doc can already brute-force the
// hash offline in well under a second; hashing mainly stops the PIN from
// being trivially readable in plain text in the Firebase Console, a
// network tab, or a screen-share. Real protection for something this
// short would mean never exposing it to an unauthenticated read at all —
// e.g. verifying it in a Cloud Function instead — which this app's
// otherwise-client-only Firebase mode doesn't have deployed. Documented
// here per the product spec's "if you defer real hashing, comment why."
//
// The staff code is mixed into the digest purely so two different staff
// members who happen to pick the same PIN don't produce the same hash —
// not a substitute for a real per-user random salt.
export async function hashPin(staffCode: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${staffCode.trim().toUpperCase()}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isValidStaffCode(code: string): boolean {
  return /^[A-Z0-9]{3,12}$/.test(code.trim().toUpperCase());
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin.trim());
}
