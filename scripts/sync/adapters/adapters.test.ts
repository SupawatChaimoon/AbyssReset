import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GameEventSchema } from '../../../shared/schema';
import { normalizeEnnead } from './ennead';
import { classify, htmlToText, normalizeKuro, parseDuration, type Notice } from './kuro-notice';

const FIXTURES = new URL('../__fixtures__/', import.meta.url);
const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(name, FIXTURES), 'utf8'));
const FreshSchema = GameEventSchema.omit({ first_seen_at: true, last_synced_at: true });

describe('ennead', () => {
  const genshin = normalizeEnnead('genshin', fixture('ennead-genshin.json'));
  const zenless = normalizeEnnead('zenless', fixture('ennead-zenless.json'));
  const starrail = normalizeEnnead('starrail', fixture('ennead-starrail.json'));

  it('produces valid events with unique ids', () => {
    for (const list of [genshin, zenless, starrail]) {
      for (const e of list) FreshSchema.parse(e);
      expect(new Set(list.map((e) => e.id)).size).toBe(list.length);
    }
  });

  it('keeps missing dates as null and marks them unverified', () => {
    const snowball = genshin.find((e) => e.title === 'Carefree Snowball Fight')!;
    expect(snowball).toMatchObject({ start_at: null, end_at: null, status: 'unverified' });
    const threshold = zenless.find((e) => e.title === 'Threshold Simulation')!;
    expect(threshold.end_at).toBeNull();
    expect(threshold.status).toBe('unverified');
  });

  it('converts unix seconds to UTC', () => {
    expect(genshin.find((e) => e.raw_source_id === '234')).toMatchObject({
      type: 'banner',
      subtype: 'character',
      title: 'Character Event Wish: Skirk',
      start_at: '2026-10-13T10:00:00.000Z',
      end_at: '2026-11-03T06:59:59.000Z',
      status: 'confirmed',
    });
  });

  it('builds a stable ZZZ banner id from item ids, even when a name is blank', () => {
    const wEngine = zenless.find((e) => e.id === 'zenless:banner:3.3-w_engine-14156.14164')!;
    expect(wEngine.title).toBe('W-Engine Channel: Flawless Etiquette');
  });

  it('names untitled Star Rail banners after the 5-star', () => {
    expect(starrail.find((e) => e.raw_source_id === '96')!.title).toBe('Character Event Warp: Evanescia');
    expect(starrail.find((e) => e.raw_source_id === '99')!.subtype).toBe('light_cone');
  });

  it('throws when the format changes', () => {
    expect(() => normalizeEnnead('genshin', { banners: 'nope' })).toThrow();
  });
});

describe('kuro notice', () => {
  const raw = fixture('kuro-notice.json');
  const contents = new Map(
    readdirSync(FIXTURES)
      .filter((f) => f.startsWith('kuro-content-'))
      .map((f) => [f.match(/\d+/)![0], htmlToText((fixture(f) as { textContent: string }).textContent)]),
  );
  const events = normalizeKuro(raw, contents);
  const byId = (id: string) => events.find((e) => e.raw_source_id === id)!;

  it('parses the duration formats Kuro uses', () => {
    expect(parseDuration('✦Duration✦\n2026-10-08 04:00 - 2026-10-26 03:59 (server time)\n✦Rewards✦')).toEqual({
      start: '2026-10-07T20:00:00.000Z',
      end: '2026-10-25T19:59:00.000Z',
    });
    expect(parseDuration('✦Duration✦\nVersion 3.7 Update - 2026-11-11 03:59 (server time)')).toEqual({
      start: null,
      after_version: '3.7',
      end: '2026-11-10T19:59:00.000Z',
    });
    expect(parseDuration('✦Duration✦\nPermanently available after Version 3.7 update.')).toEqual({
      start: null,
      after_version: '3.7',
      end: null,
    });
    expect(parseDuration('✦Duration✦\nDuration of X: From 2026-07-17 04:00 (server time)')).toEqual({
      start: '2026-07-16T20:00:00.000Z',
      end: null,
    });
    expect(parseDuration('no duration here')).toBeNull();
  });

  it('makes one patch per version, starting when maintenance ends', () => {
    const patches = events.filter((e) => e.type === 'patch');
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ id: 'wuwa:patch:3.7', start_at: '2026-09-30T03:00:00.000Z', status: 'confirmed' });
  });

  it('resolves "Version X.X Update" to the patch start', () => {
    expect(byId('50854')).toMatchObject({ start_at: '2026-09-30T03:00:00.000Z', end_at: '2026-11-10T19:59:00.000Z', status: 'confirmed' });
  });

  it('falls back to the display window as unverified when the body is missing', () => {
    const withoutBodies = normalizeKuro(raw, new Map());
    expect(withoutBodies.find((e) => e.raw_source_id === '50860')).toMatchObject({
      start_at: '2026-10-07T03:00:00.000Z',
      status: 'unverified',
    });
  });

  it('skips system, shop and CN-only notices', () => {
    const ids = new Set(events.map((e) => e.raw_source_id));
    for (const id of ['50864', '50888', '50487', '50489', '50839', '50856']) expect(ids.has(id)).toBe(false);
  });

  it('classifies Convene notices as banners', () => {
    const notice = { tabTitle: { en: 'Featured Weapon Convene: Moonlit Edge' }, category: 2 } as unknown as Notice;
    expect(classify(notice)).toEqual({ type: 'banner', subtype: 'weapon' });
  });

  it('fails when nothing can be classified', () => {
    const file = raw as { game: Notice[]; activity: Notice[] };
    const garbled = {
      game: file.game.map((n) => ({ ...n, category: 9, tabTitle: { en: 'Something' } })),
      activity: [],
    };
    expect(() => normalizeKuro(garbled, new Map())).toThrow(/classified/);
  });
});
