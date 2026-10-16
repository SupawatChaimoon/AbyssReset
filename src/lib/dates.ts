import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** th-TH uses the Buddhist calendar by default, e.g. "16 ต.ค. 2569". */
const LOCALE = 'th-TH';

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(options: Intl.DateTimeFormatOptions, timeZone?: string) {
  const key = JSON.stringify(options) + (timeZone ?? '');
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, { ...options, timeZone });
    fmtCache.set(key, f);
  }
  return f;
}

export const formatMonthTitle = (d: Date) => fmt({ month: 'long', year: 'numeric' }).format(d);
export const formatDay = (d: Date) => fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(d);
export const formatDayLong = (d: Date) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const formatDate = (d: Date, timeZone?: string) => fmt({ day: 'numeric', month: 'short', year: 'numeric' }, timeZone).format(d);
export const formatTime = (d: Date, timeZone?: string) => fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, timeZone).format(d);
export const formatDateTime = (d: Date, timeZone?: string) =>
  `${formatDate(d, timeZone)} ${formatTime(d, timeZone)}`;

/** "GMT+7" style label of a zone at a given instant; undefined zone = this device. */
export function offsetLabel(d: Date, timeZone?: string): string {
  const part = fmt({ timeZoneName: 'shortOffset' }, timeZone)
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName');
  return (part?.value ?? '').replace('GMT', 'UTC') || 'UTC';
}

/** Parse "YYYY-MM-DD" as a local calendar day (not UTC midnight). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local calendar day as "YYYY-MM-DD". */
export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const todayInput = () => toDateInput(new Date());
export const addDaysInput = (s: string, n: number) => toDateInput(addDays(parseLocalDate(s), n));

export const parseUtc = (s: string | null | undefined) => (s ? parseISO(s) : null);

/** Last local day an instant belongs to; an end exactly at midnight belongs to the day before. */
export function lastDayOf(end: Date, start: Date | null): Date {
  const day = startOfDay(end);
  if (day.getTime() === end.getTime() && (!start || end > start)) return addDays(day, -1);
  return day;
}

/** "3 วัน 4 ชม." / "5 ชม. 12 นาที" / "8 นาที" */
export function formatDuration(ms: number): string {
  const total = Math.max(ms, MINUTE);
  const d = Math.floor(total / DAY);
  const h = Math.floor((total % DAY) / HOUR);
  const m = Math.floor((total % HOUR) / MINUTE);
  if (d >= 1) return h ? `${d} วัน ${h} ชม.` : `${d} วัน`;
  if (h >= 1) return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
  return `${m} นาที`;
}

export type Phase = 'undated' | 'upcoming' | 'active' | 'open' | 'ended';

export function phaseOf(start: Date | null, end: Date | null, now: Date): Phase {
  if (!start && !end) return 'undated';
  if (start && now < start) return 'upcoming';
  if (end) return now <= end ? 'active' : 'ended';
  return 'open';
}

/** Short status text such as "เหลือ 3 วัน 4 ชม." or "เริ่มในอีก 2 วัน". */
export function relativeLabel(start: Date | null, end: Date | null, now: Date): string {
  switch (phaseOf(start, end, now)) {
    case 'upcoming':
      return `เริ่มในอีก ${formatDuration(start!.getTime() - now.getTime())}`;
    case 'active':
      return `เหลือ ${formatDuration(end!.getTime() - now.getTime())}`;
    case 'ended':
      return 'สิ้นสุดแล้ว';
    case 'open':
      return 'ยังไม่ประกาศวันสิ้นสุด';
    default:
      return 'ยังไม่ระบุวันที่';
  }
}

/** Whole days from today until a local date; negative once it has passed. */
export const daysUntil = (date: Date, now: Date) => differenceInCalendarDays(date, now);

export const MS = { MINUTE, HOUR, DAY };
