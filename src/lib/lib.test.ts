import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../shared/schema';
import { emptyStore, importStore, parseStore, type PersonalStore } from '../data/personal';
import { buildAgenda } from './agenda';
import { formatDuration, lastDayOf, relativeLabel } from './dates';
import { applyFilters, matchesTime } from './filters';
import { fromEvent, fromPersonal, spanOf, OPEN_END_DAYS, type CalendarItem } from './items';
import { layoutMonth, monthGrid } from './monthLayout';

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

function item(over: Partial<CalendarItem> & { start: Date | null; end: Date | null }): CalendarItem {
  return {
    key: Math.random().toString(36),
    category: 'event',
    game_id: 'genshin',
    title: 'x',
    all_day: false,
    status: 'confirmed',
    manual: false,
    ...over,
  };
}

describe('dates', () => {
  it('formats durations in Thai', () => {
    expect(formatDuration((3 * 24 + 4) * 3_600_000)).toBe('3 วัน 4 ชม.');
    expect(formatDuration(2 * 24 * 3_600_000)).toBe('2 วัน');
    expect(formatDuration(5 * 3_600_000 + 12 * 60_000)).toBe('5 ชม. 12 นาที');
    expect(formatDuration(10_000)).toBe('1 นาที');
  });

  it('labels each phase', () => {
    const now = local(2026, 10, 16, 12);
    expect(relativeLabel(local(2026, 10, 18, 12), local(2026, 10, 20), now)).toBe('เริ่มในอีก 2 วัน');
    expect(relativeLabel(local(2026, 10, 1), local(2026, 10, 19, 16), now)).toBe('เหลือ 3 วัน 4 ชม.');
    expect(relativeLabel(local(2026, 10, 1), local(2026, 10, 2), now)).toBe('สิ้นสุดแล้ว');
    expect(relativeLabel(local(2026, 10, 1), null, now)).toBe('ยังไม่ประกาศวันสิ้นสุด');
    expect(relativeLabel(null, null, now)).toBe('ยังไม่ระบุวันที่');
  });

  it('puts an end at exactly midnight on the previous day', () => {
    expect(lastDayOf(local(2026, 10, 20), local(2026, 10, 1))).toEqual(local(2026, 10, 19));
    expect(lastDayOf(local(2026, 10, 20, 3, 59), local(2026, 10, 1))).toEqual(local(2026, 10, 20));
  });
});

describe('items', () => {
  it('converts a public event and marks manual entries', () => {
    const e = {
      id: 'wuwa:endgame:x',
      source_id: 'manual',
      game_id: 'wuwa',
      type: 'endgame',
      title: 'Whimpering Wastes',
      start_at: '2026-10-12T20:00:00.000Z',
      end_at: null,
      all_day: false,
      timezone: 'Asia/Singapore',
      region: 'sea',
      status: 'unverified',
      source_name: 'manual',
      last_synced_at: '2026-10-15T00:00:00.000Z',
      first_seen_at: '2026-10-15T00:00:00.000Z',
    } satisfies GameEvent;
    const it = fromEvent(e);
    expect(it.manual).toBe(true);
    expect(it.start?.toISOString()).toBe('2026-10-12T20:00:00.000Z');
    expect(it.end).toBeNull();
  });

  it('caps open-ended spans and handles undated items', () => {
    const s = spanOf(item({ start: local(2026, 10, 1, 10), end: null }))!;
    expect(s.openEnd).toBe(true);
    expect(Math.round((s.to.getTime() - s.from.getTime()) / 86_400_000)).toBe(OPEN_END_DAYS - 1);
    expect(spanOf(item({ start: null, end: null }))).toBeNull();
  });

  it('turns personal data into calendar items', () => {
    const store: PersonalStore = {
      ...emptyStore(),
      subscriptions: [{ id: 's', game_id: 'genshin', name: 'Welkin', start_date: '2026-10-01', end_date: '2026-10-30', renewal: 'manual' }],
      battle_passes: [{ id: 'b', game_id: 'starrail', name: 'Nameless Honor', start_date: '2026-10-01', end_date: '2026-11-10', purchased: true }],
      personal_events: [{ id: 'p', title: 'Farm', date: '2026-10-20', time: '19:30' }],
    };
    const [sub, bp, pe] = fromPersonal(store);
    expect(sub.title).toBe('Welkin หมดอายุ');
    expect(sub.start).toEqual(local(2026, 10, 30));
    expect(bp.end?.getDate()).toBe(10);
    expect(pe.start).toEqual(local(2026, 10, 20, 19, 30));
    expect(pe.all_day).toBe(false);
    expect([sub, bp, pe].every((i) => i.status === 'personal' && i.category === 'mine')).toBe(true);
  });
});

describe('filters', () => {
  const now = local(2026, 10, 16, 12);
  it('matches time windows', () => {
    const active = item({ start: local(2026, 10, 1), end: local(2026, 10, 30) });
    const ending = item({ start: local(2026, 10, 1), end: local(2026, 10, 18) });
    const upcoming = item({ start: local(2026, 10, 20), end: local(2026, 10, 30) });
    const undated = item({ start: null, end: null });
    expect(matchesTime(active, 'active', now)).toBe(true);
    expect(matchesTime(active, 'ending', now)).toBe(false);
    expect(matchesTime(ending, 'ending', now)).toBe(true);
    expect(matchesTime(upcoming, 'upcoming', now)).toBe(true);
    expect(matchesTime(upcoming, 'active', now)).toBe(false);
    expect(matchesTime(undated, 'active', now)).toBe(false);
    expect(matchesTime(undated, 'all', now)).toBe(true);
  });

  it('filters by game and type; personal items without a game ignore the game filter', () => {
    const gi = item({ start: now, end: now, game_id: 'genshin' });
    const hsr = item({ start: now, end: now, game_id: 'starrail', category: 'banner' });
    const mine = item({ start: now, end: now, game_id: null, category: 'mine', status: 'personal' });
    const out = applyFilters([gi, hsr, mine], { games: ['starrail'], types: ['banner', 'mine'], time: 'all' }, now);
    expect(out).toEqual([hsr, mine]);
  });
});

describe('month layout', () => {
  it('builds whole weeks starting on Sunday', () => {
    const weeks = monthGrid(local(2026, 10, 1));
    expect(weeks[0][0].getDay()).toBe(0);
    expect(weeks[weeks.length - 1][6].getDay()).toBe(6);
    expect(weeks.flat().some((d) => d.getMonth() === 9 && d.getDate() === 31)).toBe(true);
  });

  it('splits bars at week edges and packs lanes without overlap', () => {
    const long = item({ title: 'long', start: local(2026, 10, 5, 10), end: local(2026, 10, 14, 10) });
    const a = item({ title: 'a', start: local(2026, 10, 5), end: local(2026, 10, 6, 12) });
    const b = item({ title: 'b', start: local(2026, 10, 7), end: local(2026, 10, 8, 12) });
    const weeks = layoutMonth(local(2026, 10, 1), [long, a, b]);
    const week2 = weeks[1]; // Oct 4–10
    const segLong = week2.segments.find((s) => s.item === long)!;
    expect(segLong).toMatchObject({ startCol: 1, endCol: 6, contRight: true, contLeft: false });
    const segA = week2.segments.find((s) => s.item === a)!;
    const segB = week2.segments.find((s) => s.item === b)!;
    expect(segA.lane).not.toBe(segLong.lane);
    expect(segB.lane).toBe(segA.lane); // reuses the lane after a ends
    expect(weeks[2].segments.find((s) => s.item === long)).toMatchObject({ startCol: 0, endCol: 3, contLeft: true });
  });

  it('gives every game a lane before any game gets a second one', () => {
    const at = (game: 'genshin' | 'starrail', d: number) =>
      item({ title: `${game}${d}`, game_id: game, category: 'banner', start: local(2026, 10, d), end: local(2026, 10, 16) });
    const hsr = [1, 2, 3].map((d) => at('starrail', d));
    const gi = at('genshin', 13);
    const week = layoutMonth(local(2026, 10, 1), [...hsr, gi], 2)[2]; // Oct 11–17
    expect(week.segments.map((s) => s.item.title).sort()).toEqual(['genshin13', 'starrail1']);
  });

  it('counts bars beyond the lane limit as hidden', () => {
    const items = Array.from({ length: 5 }, (_, i) => item({ title: `i${i}`, start: local(2026, 10, 14, 10), end: local(2026, 10, 14, 11) }));
    const week = layoutMonth(local(2026, 10, 1), items, 3)[2]; // Oct 11–17
    expect(week.segments).toHaveLength(3);
    expect(week.hidden[3]).toBe(2);
    expect(week.dayItems[3]).toHaveLength(5);
  });
});

describe('agenda', () => {
  it('lists starts and ends per day and keeps month-long items on top', () => {
    const banner = item({ title: 'banner', start: local(2026, 10, 13, 10), end: local(2026, 11, 3, 6) });
    const ends = item({ title: 'ends', start: local(2026, 9, 20), end: local(2026, 10, 20, 6) });
    const through = item({ title: 'through', start: local(2026, 9, 1), end: local(2026, 11, 30) });
    const undated = item({ title: 'undated', start: null, end: null });
    const a = buildAgenda(local(2026, 10, 1), [banner, ends, through, undated]);
    expect(a.ongoing).toEqual([through]);
    expect(a.undated).toEqual([undated]);
    expect(a.days.map((d) => [d.date.getDate(), d.entries.map((e) => `${e.item.title}:${e.role}`)])).toEqual([
      [13, ['banner:start']],
      [20, ['ends:end']],
    ]);
  });
});

describe('personal store', () => {
  it('fills defaults and rejects bad files', () => {
    const s = parseStore({ schema_version: 1 });
    expect(s.settings.followed_games).toHaveLength(4);
    expect(() => parseStore({ schema_version: 2 })).toThrow();
    expect(() =>
      parseStore({ schema_version: 1, subscriptions: [{ id: 'x', game_id: 'nope', name: 'a', start_date: '2026-01-01', end_date: '2026-01-02', renewal: 'auto' }] }),
    ).toThrow(/subscriptions/);
  });

  it('merges by id or replaces everything', () => {
    const cur: PersonalStore = {
      ...emptyStore(),
      personal_events: [
        { id: '1', title: 'old', date: '2026-10-01' },
        { id: '2', title: 'keep', date: '2026-10-02' },
      ],
    };
    const inc: PersonalStore = {
      ...emptyStore(),
      settings: { ...emptyStore().settings, default_view: 'agenda' },
      personal_events: [
        { id: '1', title: 'new', date: '2026-10-01' },
        { id: '3', title: 'added', date: '2026-10-03' },
      ],
    };
    const merged = importStore(cur, inc, 'merge');
    expect(merged.personal_events.map((p) => p.title)).toEqual(['new', 'keep', 'added']);
    expect(merged.settings.default_view).toBe('auto');
    expect(importStore(cur, inc, 'replace')).toBe(inc);
  });
});
