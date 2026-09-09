// Staff ID validation for the Scan-to-Job login (StaffIdGate.tsx). Digits
// only, deliberately not the alphanumeric [A-Z0-9] the PRD originally
// floated: a Staff ID typed on the same on-screen number pad used
// elsewhere in the app means nothing on this screen ever needs a letter
// keyboard — no mismatched keyboard layouts on a shared kiosk device.
//
// There's no PIN in this flow — Staff ID alone logs someone in. A person
// only ever gets a Staff ID from an Admin in the first place, so knowing
// the code already means someone handed it to you; see AdminPortal.tsx's
// "Staff ID" action and the Print QR tab, which never puts one on a QR.
export function isValidStaffCode(code: string): boolean {
  return /^[0-9]{3,12}$/.test(code.trim());
}
