import { describe, expect, it } from 'vitest';
import type { FreshEvent } from './adapters/types';
import { combine, type Outcome } from './combine';
import { normalizeManual } from './manual';
import { mergeSource } from './merge';

const T1 = '2026-10-01T00:00:00.000Z';
const T2 = '2026-10-02T00:00:00.000Z';

const fresh = (id: string, over: Partial<FreshEvent> = {}): FreshEvent => ({
  id,
  source_id: 'ennead:genshin',
  game_id: 'genshin',
  type: 'event',
  title: id,
  start_at: '2026-10-10T00:00:00.000Z',
  end_at: '2026-10-20T00:00:00.000Z',
  all_day: false,
  timezone: 'Asia/Shanghai',
  region: 'asia',
  status: 'confirmed',
  source_name: 'test',
  ...over,
});

const ok = (id: string, value: FreshEvent[], mode: Outcome['mode'] = 'accumulate'): Outcome => ({
  id,
  game_id: 'genshin',
  supported: ['event'],
  mode,
  result: { status: 'fulfilled', value },
});

describe('mergeSource', () => {
  it('is idempotent: a second run with the same data changes nothing', () => {
    const first = mergeSource([], [fresh('a'), fresh('b')], T1, 'accumulate');
    const second = mergeSource(first.events, [fresh('a'), fresh('b')], T2, 'accumulate');
    expect(second).toMatchObject({ added: 0, updated: 0, unchanged: 2 });
    expect(second.events).toEqual(first.events);
  });

  it('updates a changed date in place instead of adding a duplicate', () => {
    const first = mergeSource([], [fresh('a')], T1, 'accumulate');
    const second = mergeSource(first.events, [fresh('a', { end_at: '2026-10-25T00:00:00.000Z' })], T2, 'accumulate');
    expect(second.events).toHaveLength(1);
    expect(second.events[0]).toMatchObject({ end_at: '2026-10-25T00:00:00.000Z', first_seen_at: T1, last_synced_at: T2 });
  });

  it('keeps items the source stopped listing (accumulate) but drops them for replace', () => {
    const first = mergeSource([], [fresh('a'), fresh('b')], T1, 'accumulate');
    expect(mergeSource(first.events, [fresh('a')], T2, 'accumulate').events).toHaveLength(2);
    expect(mergeSource(first.events, [fresh('a')], T2, 'replace').events).toHaveLength(1);
  });

  it('drops duplicate ids within one batch', () => {
    expect(mergeSource([], [fresh('a'), fresh('a')], T1, 'accumulate').events).toHaveLength(1);
  });
});

describe('combine', () => {
  it('keeps a failed source\'s previous items and its last success time', () => {
    const before = combine([], [ok('ennead:genshin', [fresh('a')]), ok('kuro:wuwa', [fresh('w', { source_id: 'kuro:wuwa', game_id: 'wuwa' })])], [], T1);
    const after = combine(
      before.events,
      [
        { ...ok('ennead:genshin', []), result: { status: 'rejected', reason: new Error('HTTP 500') } },
        ok('kuro:wuwa', [fresh('w', { source_id: 'kuro:wuwa', game_id: 'wuwa' })]),
      ],
      before.sources,
      T2,
    );
    expect(after.events.map((e) => e.id).sort()).toEqual(['a', 'w']);
    expect(after.sources[0]).toMatchObject({ ok: false, error: 'HTTP 500', last_success_at: T1, last_attempt_at: T2, item_count: 1 });
    expect(after.sources[1]).toMatchObject({ ok: true, last_success_at: T2 });
  });
});

describe('manual events', () => {
  const entry = {
    game_id: 'wuwa',
    type: 'endgame',
    title: 'Whimpering Wastes',
    start_at: '2026-10-13T04:00:00+08:00',
    end_at: '2026-10-27T03:59:59+08:00',
    region: 'sea',
  };

  it('stores times as UTC, confirmed only with a source link', () => {
    const [noLink] = normalizeManual([entry]).events;
    expect(noLink).toMatchObject({ start_at: '2026-10-12T20:00:00.000Z', status: 'unverified', source_name: 'กรอกโดยผู้ดูแล' });
    const [linked] = normalizeManual([{ ...entry, source_url: 'https://example.com/notice' }]).events;
    expect(linked.status).toBe('confirmed');
  });

  it('gives the same id on every run', () => {
    expect(normalizeManual([entry]).events[0].id).toBe(normalizeManual([entry]).events[0].id);
  });

  it('skips entries the automatic source already covers', () => {
    const r = normalizeManual([{ ...entry, game_id: 'genshin', type: 'banner', region: 'asia' }]);
    expect(r.events).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/already comes from the automatic source/);
  });

  it('rejects malformed entries', () => {
    expect(() => normalizeManual([{ ...entry, start_at: '13/10/2026' }])).toThrow();
    expect(() => normalizeManual([{ ...entry, repeat: { every_days: 28 } }])).toThrow();
  });
});
