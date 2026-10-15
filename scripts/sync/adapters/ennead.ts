import { z } from 'zod';
import { GAMES, SUPPORTED_TYPES } from '../../../shared/games';
import type { GameId } from '../../../shared/schema';
import { makeId } from '../id';
import { fetchJson, toIso, type FreshEvent, type SourceAdapter } from './types';

const time = z.number().nullable().optional();
const Featured = z.looseObject({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().nullish(),
  icon: z.string().nullish(),
  rarity: z.union([z.number(), z.string()]).optional(),
});
const Banner = z.looseObject({
  id: z.number().optional(),
  name: z.string().nullish(),
  banner_type: z.string().nullish(),
  version: z.string().nullish(),
  characters: z.array(Featured).optional(),
  weapons: z.array(Featured).optional(),
  light_cones: z.array(Featured).optional(),
  agents: z.array(Featured).optional(),
  w_engines: z.array(Featured).optional(),
  start_time: time,
  end_time: time,
});
const Activity = z.looseObject({
  id: z.number().optional(),
  name: z.string(),
  description: z.string().nullish(),
  image_url: z.string().nullish(),
  start_time: time,
  end_time: time,
});
const EnneadCalendar = z.looseObject({
  banners: z.array(Banner),
  challenges: z.array(Activity),
  events: z.array(Activity),
});
type Banner = z.infer<typeof Banner>;

const SOURCE_NAME = 'Ennead API';

/** ZZZ ranks are letters; everything else is already 4/5. */
const rarityNum = (r: number | string | undefined) =>
  typeof r === 'number' ? r : r === 'S' ? 5 : r === 'A' ? 4 : r === 'B' ? 3 : undefined;

function bannerKind(game: GameId, b: Banner): { subtype: string; label: string; items: z.infer<typeof Featured>[] } {
  if (b.characters?.length) return { subtype: 'character', label: game === 'starrail' ? 'Character Event Warp' : 'Character Event Wish', items: b.characters };
  if (b.weapons?.length) return { subtype: 'weapon', label: 'Weapon Event Wish', items: b.weapons };
  if (b.light_cones?.length) return { subtype: 'light_cone', label: 'Light Cone Event Warp', items: b.light_cones };
  if (b.agents?.length || b.banner_type === 'GACHA_TYPE_CHARACTER_UP') return { subtype: 'character', label: 'Exclusive Channel', items: b.agents ?? [] };
  return { subtype: 'w_engine', label: 'W-Engine Channel', items: b.w_engines ?? [] };
}

export function normalizeEnnead(game_id: GameId, raw: unknown): FreshEvent[] {
  const data = EnneadCalendar.parse(raw);
  const game = GAMES[game_id];
  const source_id = `ennead:${game_id}`;
  const base = {
    source_id,
    game_id,
    all_day: false,
    timezone: game.timezone,
    region: game.region,
    source_name: SOURCE_NAME,
    source_url: game.news_url,
  } as const;
  const dates = (s: number | null | undefined, e: number | null | undefined) => {
    const start_at = toIso(s);
    const end_at = toIso(e);
    // Never guess: a missing date stays null and the item is marked unverified.
    return { start_at, end_at, status: start_at && end_at ? ('confirmed' as const) : ('unverified' as const) };
  };
  const out: FreshEvent[] = [];

  for (const b of data.banners) {
    const kind = bannerKind(game_id, b);
    const featured = kind.items
      .filter((f) => f.name)
      .map((f) => ({ name: f.name!, image_url: f.icon ?? undefined, rarity: rarityNum(f.rarity) }));
    const top = Math.max(0, ...featured.map((f) => f.rarity ?? 0));
    const headliners = featured.filter((f) => f.rarity === top).map((f) => f.name);
    const label = b.name || kind.label;
    const title = headliners.length ? `${label}: ${headliners.join(' / ')}` : label;
    // ZZZ banners have no id; their item ids are stable even while names are still blank.
    const raw_source_id = b.id
      ? String(b.id)
      : b.version
        ? `${b.version}-${kind.subtype}-` +
          kind.items.filter((f) => rarityNum(f.rarity) === 5).map((f) => f.id).sort().join('.')
        : undefined;
    const d = dates(b.start_time, b.end_time);
    out.push({
      ...base,
      ...d,
      id: makeId(game_id, 'banner', raw_source_id, title, d.start_at),
      type: 'banner',
      subtype: kind.subtype,
      title,
      version: b.version ?? undefined,
      featured,
      raw_source_id,
    });
  }

  const activities = [
    ...data.challenges.map((a) => ['endgame', a] as const),
    ...data.events.map((a) => ['event', a] as const),
  ];
  for (const [type, a] of activities) {
    // Genshin challenges come with id 0, which is not a real id.
    const raw_source_id = a.id ? String(a.id) : undefined;
    const d = dates(a.start_time, a.end_time);
    out.push({
      ...base,
      ...d,
      id: makeId(game_id, type, raw_source_id, a.name, d.start_at),
      type,
      title: a.name,
      image_url: a.image_url || undefined,
      description: a.description || undefined,
      raw_source_id,
    });
  }
  return out;
}

export function enneadAdapter(game_id: Exclude<GameId, 'wuwa'>): SourceAdapter {
  return {
    id: `ennead:${game_id}`,
    game_id,
    supported_types: SUPPORTED_TYPES[game_id],
    load: async () => normalizeEnnead(game_id, await fetchJson(`https://api.ennead.cc/mihoyo/${game_id}/calendar`)),
  };
}
