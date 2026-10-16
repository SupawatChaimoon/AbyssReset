/**
 * Agenda view for one month: each day lists what starts and what ends on it,
 * so banner end dates are as easy to spot as start dates. Items running through
 * the whole month without starting or ending in it are listed once at the top.
 */
import { endOfMonth, isSameDay, startOfDay, startOfMonth } from 'date-fns';
import { compareItems, spanOf, type CalendarItem } from './items';

export type AgendaRole = 'start' | 'end' | 'single';
export type AgendaEntry = { item: CalendarItem; role: AgendaRole };
export type AgendaDay = { date: Date; entries: AgendaEntry[] };
export type Agenda = { ongoing: CalendarItem[]; days: AgendaDay[]; undated: CalendarItem[] };

export function buildAgenda(month: Date, items: CalendarItem[]): Agenda {
  const first = startOfMonth(month);
  const last = startOfDay(endOfMonth(month));
  const byDay = new Map<number, AgendaEntry[]>();
  const ongoing: CalendarItem[] = [];
  const undated: CalendarItem[] = [];
  const add = (date: Date, entry: AgendaEntry) => {
    const k = date.getTime();
    byDay.set(k, [...(byDay.get(k) ?? []), entry]);
  };
  const inMonth = (d: Date) => d >= first && d <= last;

  for (const item of items) {
    const span = spanOf(item);
    if (!span) {
      undated.push(item);
      continue;
    }
    if (span.to < first || span.from > last) continue;
    const single = isSameDay(span.from, span.to) && !span.openEnd;
    const startsHere = inMonth(span.from) && !span.openStart;
    const endsHere = !span.openEnd && inMonth(span.to);
    if (single) add(span.from, { item, role: 'single' });
    else {
      if (startsHere) add(span.from, { item, role: 'start' });
      if (endsHere) add(span.to, { item, role: span.openStart ? 'single' : 'end' });
      if (!startsHere && !endsHere) ongoing.push(item);
    }
  }

  const roleOrder: Record<AgendaRole, number> = { end: 0, single: 1, start: 2 };
  const days = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([k, entries]) => ({
      date: new Date(k),
      entries: entries.sort((a, b) => {
        const ta = (a.role === 'end' ? a.item.end : a.item.start)?.getTime() ?? 0;
        const tb = (b.role === 'end' ? b.item.end : b.item.start)?.getTime() ?? 0;
        return ta - tb || roleOrder[a.role] - roleOrder[b.role] || compareItems(a.item, b.item);
      }),
    }));

  ongoing.sort((a, b) => (a.end?.getTime() ?? Infinity) - (b.end?.getTime() ?? Infinity) || compareItems(a, b));
  undated.sort(compareItems);
  return { ongoing, days, undated };
}
