// 'YYYY-MM-DD' for the device's LOCAL calendar day. The forms used to take
// `new Date().toISOString().slice(0, 10)`, which is the UTC day: in Papua
// (WIT, UTC+9) anything filled in before 09:00 landed on YESTERDAY's
// sheet — e.g. the 08:00 temperature reading. PSU's phones run in local
// time, so this matches the day on the paper form.
export function localDateISO(d: Date | string | number = new Date()): string {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
