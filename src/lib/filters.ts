import type { GameId } from '../../shared/schema';
import { MS } from './dates';
import { CATEGORY_ORDER, type CalendarItem, type Category } from './items';

export type TimeFilter = 'all' | 'active' | 'upcoming' | 'ending';

export type Filters = {
  /** Games currently shown. */
  games: GameId[];
  types: Category[];
  time: TimeFilter;
};

export const ALL_TYPES: Category[] = CATEGORY_ORDER;
export const ENDING_SOON_MS = 3 * MS.DAY;

export function matchesTime(item: CalendarItem, time: TimeFilter, now: Date): boolean {
  const { start, end } = item;
  const t = now.getTime();
  switch (time) {
    case 'all':
      return true;
    case 'active':
      if (!start && !end) return false;
      return (!start || start.getTime() <= t) && (!end || end.getTime() >= t);
    case 'upcoming':
      return !!start && start.getTime() > t;
    case 'ending':
      return !!end && end.getTime() >= t && end.getTime() - t <= ENDING_SOON_MS && (!start || start.getTime() <= t);
  }
}

export function applyFilters(items: CalendarItem[], f: Filters, now: Date): CalendarItem[] {
  const games = new Set(f.games);
  const types = new Set(f.types);
  return items.filter((item) => {
    if (!types.has(item.category)) return false;
    // A personal item without a game is not tied to any game toggle.
    if (item.game_id && !games.has(item.game_id)) return false;
    return matchesTime(item, f.time, now);
  });
}

export const isDefaultFilters = (f: Filters, followed: GameId[]) =>
  f.time === 'all' && f.types.length === ALL_TYPES.length && followed.every((g) => f.games.includes(g));
