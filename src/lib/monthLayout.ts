/**
 * Turns items into bars for a month grid: each week row gets segments that are
 * packed into lanes so they never overlap. Items are placed by LANE_PRIORITY,
 * then round-robin across games (so one game's six banners cannot crowd out
 * another's), then start date; lanes beyond `maxLanes` are counted per day and shown as "+N".
 */
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { compareItems, spanOf, type CalendarItem, type Category, type Span } from './items';

/** When a day runs out of lanes, these keep their place first: banners matter more than login events. */
export const LANE_PRIORITY: Category[] = ['patch', 'banner', 'mine', 'endgame', 'event'];

export const WEEK_STARTS_ON = 0; // Sunday, as on Thai wall calendars

export type Segment = {
  item: CalendarItem;
  span: Span;
  /** Columns 0–6 inside the week. */
  startCol: number;
  endCol: number;
  lane: number;
  /** The bar continues from the previous week / into the next week. */
  contLeft: boolean;
  contRight: boolean;
  /** This segment holds the real first/last day of the item. */
  isStart: boolean;
  isEnd: boolean;
};

export type WeekLayout = {
  days: Date[];
  segments: Segment[];
  /** Bars not drawn because the day ran out of lanes, per column. */
  hidden: number[];
  /** Every item touching that day, for the day list. */
  dayItems: CalendarItem[][];
};

export function monthGrid(month: Date): Date[][] {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
  const last = endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
  const weeks: Date[][] = [];
  for (let d = first; d <= last; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  }
  return weeks;
}

export function layoutMonth(month: Date, items: CalendarItem[], maxLanes = 3): WeekLayout[] {
  const byStart = items
    .map((item) => ({ item, span: spanOf(item), rank: 0 }))
    .filter((x): x is { item: CalendarItem; span: Span; rank: number } => x.span !== null)
    .sort((a, b) => a.span.from.getTime() - b.span.from.getTime() || compareItems(a.item, b.item));
  const seen = new Map<string, number>();
  for (const x of byStart) {
    const k = `${x.item.category}|${x.item.game_id}`;
    x.rank = seen.get(k) ?? 0;
    seen.set(k, x.rank + 1);
  }
  const spans = byStart.sort((a, b) => {
      const p = LANE_PRIORITY.indexOf(a.item.category) - LANE_PRIORITY.indexOf(b.item.category);
      if (p) return p;
      if (a.rank !== b.rank) return a.rank - b.rank;
      const d = a.span.from.getTime() - b.span.from.getTime();
      if (d) return d;
      const len = b.span.to.getTime() - b.span.from.getTime() - (a.span.to.getTime() - a.span.from.getTime());
      return len || compareItems(a.item, b.item);
    });

  return monthGrid(month).map((days) => {
    const weekStart = days[0];
    const weekEnd = days[6];
    /** lanes[l][c] = column c of lane l is taken. */
    const lanes: boolean[][] = [];
    const segments: Segment[] = [];
    const hidden = Array(7).fill(0);
    const dayItems: CalendarItem[][] = days.map(() => []);

    for (const { item, span } of spans) {
      if (span.to < weekStart || span.from > weekEnd) continue;
      const startCol = Math.max(0, differenceInCalendarDays(span.from, weekStart));
      const endCol = Math.min(6, differenceInCalendarDays(span.to, weekStart));
      for (let c = startCol; c <= endCol; c++) dayItems[c].push(item);

      const free = (l: boolean[]) => l.slice(startCol, endCol + 1).every((taken) => !taken);
      let lane = lanes.findIndex(free);
      if (lane === -1) lane = lanes.push(Array(7).fill(false)) - 1;
      for (let c = startCol; c <= endCol; c++) lanes[lane][c] = true;

      if (lane >= maxLanes) {
        for (let c = startCol; c <= endCol; c++) hidden[c]++;
        continue;
      }
      segments.push({
        item,
        span,
        startCol,
        endCol,
        lane,
        contLeft: span.from < weekStart,
        contRight: span.to > weekEnd,
        isStart: span.from >= weekStart,
        isEnd: span.to <= weekEnd,
      });
    }
    return { days, segments, hidden, dayItems };
  });
}
