// Staff ID validation for the Scan-to-Job login (StaffIdGate.tsx).
// Alphanumeric, 3-12 chars — matches the on-screen keypad, which has a
// 123/ABC toggle so a code can mix digits and letters (e.g. "TECH01").
// Case-insensitive here since every comparison site (authService.ts,
// usersService.ts, useAppStore.ts) uppercases before comparing anyway;
// this only checks the shape.
//
// There's no PIN in this flow — Staff ID alone logs someone in. A person
// only ever gets a Staff ID from an Admin in the first place, so knowing
// the code already means someone handed it to you; see AdminPortal.tsx's
// "Staff ID" action and the Print QR tab, which never puts one on a QR.
export function isValidStaffCode(code: string): boolean {
  return /^[A-Za-z0-9]{3,12}$/.test(code.trim());
}
