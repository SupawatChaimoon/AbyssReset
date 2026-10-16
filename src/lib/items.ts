/**
 * CalendarItem is what every view draws. Public events and personal items are
 * converted into it only at render time, so the two data sets stay separate (FR-08).
 */
import { addDays, endOfDay, startOfDay } from 'date-fns';
import type { EventType, GameEvent, GameId } from '../../shared/schema';
import type { PersonalKind, PersonalStore } from '../data/personal';
import { lastDayOf, parseLocalDate, parseUtc } from './dates';

export type Category = EventType | 'mine';
export type ItemStatus = GameEvent['status'] | 'personal';

export type CalendarItem = {
  key: string;
  category: Category;
  game_id: GameId | null;
  title: string;
  start: Date | null;
  end: Date | null;
  /** Only a date is known, no exact time. */
  all_day: boolean;
  status: ItemStatus;
  /** Entered by the site maintainer in data-manual/manual-events.json. */
  manual: boolean;
  event?: GameEvent;
  personal?: { kind: PersonalKind; id: string; label: string };
};

export const CATEGORY_ORDER: Category[] = ['patch', 'banner', 'endgame', 'event', 'mine'];

export function fromEvent(e: GameEvent): CalendarItem {
  return {
    key: e.id,
    category: e.type,
    game_id: e.game_id,
    title: e.title,
    start: parseUtc(e.start_at),
    end: parseUtc(e.end_at),
    all_day: e.all_day,
    status: e.status,
    manual: e.source_id === 'manual',
    event: e,
  };
}

export function fromPersonal(store: PersonalStore): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const s of store.subscriptions) {
    const d = parseLocalDate(s.end_date);
    items.push({
      key: `mine:subscription:${s.id}`,
      category: 'mine',
      game_id: s.game_id,
      title: `${s.name} หมดอายุ`,
      start: startOfDay(d),
      end: endOfDay(d),
      all_day: true,
      status: 'personal',
      manual: false,
      personal: { kind: 'subscription', id: s.id, label: 'บัตรรายเดือน' },
    });
  }
  for (const b of store.battle_passes) {
    items.push({
      key: `mine:battle_pass:${b.id}`,
      category: 'mine',
      game_id: b.game_id,
      title: b.name,
      start: startOfDay(parseLocalDate(b.start_date)),
      end: endOfDay(parseLocalDate(b.end_date)),
      all_day: true,
      status: 'personal',
      manual: false,
      personal: { kind: 'battle_pass', id: b.id, label: 'แบตเทิลพาส' },
    });
  }
  for (const p of store.personal_events) {
    const d = parseLocalDate(p.date);
    let start = startOfDay(d);
    let end = endOfDay(d);
    if (p.time) {
      const [h, m] = p.time.split(':').map(Number);
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
      end = start;
    }
    items.push({
      key: `mine:personal_event:${p.id}`,
      category: 'mine',
      game_id: p.game_id ?? null,
      title: p.title,
      start,
      end,
      all_day: !p.time,
      status: 'personal',
      manual: false,
      personal: { kind: 'personal_event', id: p.id, label: 'รายการส่วนตัว' },
    });
  }
  return items;
}

/**
 * An item with a start but no announced end is drawn for at most this many days,
 * fading out, so a stale open-ended item does not fill every future month.
 */
export const OPEN_END_DAYS = 42;

export type Span = {
  /** First and last local day the item covers (both start-of-day). */
  from: Date;
  to: Date;
  openEnd: boolean;
  openStart: boolean;
};

export function spanOf(item: CalendarItem): Span | null {
  const { start, end } = item;
  if (!start && !end) return null;
  if (start && end) {
    const from = startOfDay(start);
    const to = lastDayOf(end, start);
    return { from, to: to < from ? from : to, openEnd: false, openStart: false };
  }
  if (start) {
    const from = startOfDay(start);
    return { from, to: addDays(from, OPEN_END_DAYS - 1), openEnd: true, openStart: false };
  }
  const to = lastDayOf(end!, null);
  return { from: to, to, openEnd: false, openStart: true };
}

/** Stable sort used in every list: earlier start, then longer, then category, then title. */
export function compareItems(a: CalendarItem, b: CalendarItem): number {
  const sa = a.start?.getTime() ?? a.end?.getTime() ?? Infinity;
  const sb = b.start?.getTime() ?? b.end?.getTime() ?? Infinity;
  if (sa !== sb) return sa - sb;
  const ea = a.end?.getTime() ?? Infinity;
  const eb = b.end?.getTime() ?? Infinity;
  if (ea !== eb) return eb - ea;
  const ca = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  if (ca) return ca;
  return a.title.localeCompare(b.title);
}
