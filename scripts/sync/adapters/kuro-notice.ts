import { z } from 'zod';
import { GAMES, SUPPORTED_TYPES, WUWA_ENDGAME_TITLE, WUWA_SKIP_TITLE } from '../../../shared/games';
import type { EventType } from '../../../shared/schema';
import { makeId } from '../id';
import { fetchJson, type FreshEvent, type SourceAdapter } from './types';

const NOTICE_URL =
  'https://aki-gm-resources-back.aki-game.com/gamenotice/G152/76402e5b20be2c39f095a152090afddc/notice.json';
const SOURCE_NAME = 'Kuro Games (ประกาศในเกม)';

const Notice = z.looseObject({
  id: z.string(),
  contentPrefix: z.array(z.string()).min(1),
  permanent: z.number().optional(),
  category: z.number().optional(),
  startTimeMs: z.number(),
  endTimeMs: z.number(),
  tabTitle: z.record(z.string(), z.string()),
  tabBanner: z.record(z.string(), z.array(z.string())).optional(),
});
const NoticeFile = z.looseObject({ game: z.array(Notice), activity: z.array(Notice) });
const NoticeContent = z.looseObject({ textContent: z.string() });
export type Notice = z.infer<typeof Notice>;

/** Kuro's "server time" and the (UTC+8) in notices are both UTC+8. */
const fromServerTime = (s: string) => new Date(s.replace(' ', 'T') + ':00+08:00').toISOString();
const D = '(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2})';

export function htmlToText(html: string): string {
  return html
    .replace(/<\/(div|p|li|h\d)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&hellip;/g, '…')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n');
}

export type Duration = { start: string | null; end: string | null; after_version?: string };

/** Reads the "✦Duration✦" section of a notice. Returns null if there is none. */
export function parseDuration(text: string): Duration | null {
  const m = text.match(/Duration[^\n]*\n([\s\S]*?)(?=\n[^\n]*✦[^\n]*✦|$)/i);
  if (!m) return null;
  const section = m[1];
  const range = section.match(new RegExp(`${D}\\s*[-~–]\\s*${D}`));
  if (range) return { start: fromServerTime(range[1]), end: fromServerTime(range[2]) };
  // "Version 3.7 Update - 2026-11-11 03:59" / "After the Version 3.7 update ~ ..."
  const after = section.match(new RegExp(`version (\\d+\\.\\d+)[^\\n]*?[-~–]\\s*${D}`, 'i'));
  if (after) return { start: null, after_version: after[1], end: fromServerTime(after[2]) };
  const from = section.match(new RegExp(`from\\s+${D}`, 'i'));
  if (from) return { start: fromServerTime(from[1]), end: null };
  // "Permanently available after Version 3.7 update."
  const open = section.match(/(?:after|upon)(?: the)? version (\d+\.\d+)/i);
  if (open) return { start: null, after_version: open[1], end: null };
  return null;
}

/** Patch notes give "Maintenance Time: start - end (UTC+8)"; the version is out when it ends. */
export function parseMaintenanceEnd(text: string): string | null {
  const m = text.match(new RegExp(`Maintenance Time:\\s*${D}\\s*[-~–]\\s*${D}`, 'i'));
  return m ? fromServerTime(m[2]) : null;
}

const cleanTitle = (s: string) => s.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();

type Kind = { type: EventType; subtype?: string; version?: string } | null;

export function classify(n: Notice): Kind {
  const en = cleanTitle(n.tabTitle.en ?? '');
  const zh = n.tabTitle['zh-Hans'] ?? '';
  // CN-only notices have no English title (the "en" field holds Chinese).
  if (n.permanent === 1 || !en || /[一-鿿]/.test(en)) return null;
  if (WUWA_SKIP_TITLE.some((r) => r.test(en))) return null;
  const version = (en.match(/Version (\d+\.\d+)/i) ?? zh.match(/(\d+\.\d+)版本/))?.[1];
  if (version && (/patch notes|event calendar/i.test(en) || /版本内容说明|版本活动日历/.test(zh)))
    return { type: 'patch', version };
  if (/convene/i.test(en) || /唤取/.test(zh)) return { type: 'banner', subtype: /weapon/i.test(en) ? 'weapon' : 'resonator' };
  if (WUWA_ENDGAME_TITLE.some((r) => r.test(en))) return { type: 'endgame' };
  if (n.category === 2) return { type: 'event' };
  return null;
}

/** @param contents notice id → plain text of its English content (missing if it failed to load) */
export function normalizeKuro(raw: unknown, contents: Map<string, string>): FreshEvent[] {
  const file = NoticeFile.parse(raw);
  const game = GAMES.wuwa;
  const base = {
    source_id: 'kuro:wuwa',
    game_id: 'wuwa',
    all_day: false,
    timezone: game.timezone,
    region: game.region,
    source_name: SOURCE_NAME,
    source_url: game.news_url,
  } as const;

  const notices = [...file.game, ...file.activity].map((n) => ({ n, kind: classify(n) }));

  // Patches first, so "after Version X.X" durations can use their start time.
  const patches = new Map<string, FreshEvent>();
  for (const { n, kind } of notices) {
    if (kind?.type !== 'patch') continue;
    const text = contents.get(n.id);
    const start = text ? parseMaintenanceEnd(text) : null;
    const prev = patches.get(kind.version!);
    if (prev?.status === 'confirmed') continue;
    patches.set(kind.version!, {
      ...base,
      id: makeId('wuwa', 'patch', kind.version, '', null),
      type: 'patch',
      title: `Version ${kind.version}`,
      version: kind.version,
      // A patch is a single moment, so no end date. Without the maintenance time
      // we only have the notice's display time, which is not the release time.
      start_at: start ?? new Date(n.startTimeMs).toISOString(),
      end_at: null,
      status: start ? 'confirmed' : 'unverified',
      image_url: n.tabBanner?.en?.[0],
      raw_source_id: kind.version,
    });
  }

  const out: FreshEvent[] = [...patches.values()];
  for (const { n, kind } of notices) {
    if (!kind || kind.type === 'patch') continue;
    const text = contents.get(n.id);
    const dur = text ? parseDuration(text) : null;
    let start_at: string | null;
    let end_at: string | null;
    let status: 'confirmed' | 'unverified';
    if (dur) {
      start_at = dur.after_version ? (patches.get(dur.after_version)?.start_at ?? null) : dur.start;
      end_at = dur.end;
      const patchOk = !dur.after_version || patches.get(dur.after_version)?.status === 'confirmed';
      status = start_at && end_at && patchOk ? 'confirmed' : 'unverified';
    } else {
      // The notice's display window may not match the real event window.
      start_at = new Date(n.startTimeMs).toISOString();
      end_at = new Date(n.endTimeMs).toISOString();
      status = 'unverified';
    }
    const title = cleanTitle(n.tabTitle.en);
    out.push({
      ...base,
      id: makeId('wuwa', kind.type, n.id, title, start_at),
      type: kind.type,
      subtype: kind.subtype,
      title,
      start_at,
      end_at,
      status,
      image_url: n.tabBanner?.en?.[0],
      raw_source_id: n.id,
    });
  }

  if (notices.length > 0 && out.length === 0)
    throw new Error('No notice could be classified; the title format may have changed');
  return out;
}

export const kuroAdapter: SourceAdapter = {
  id: 'kuro:wuwa',
  game_id: 'wuwa',
  supported_types: SUPPORTED_TYPES.wuwa,
  async load() {
    const raw = await fetchJson(NOTICE_URL);
    const file = NoticeFile.parse(raw);
    const wanted = [...file.game, ...file.activity].filter((n) => classify(n));
    const contents = new Map<string, string>();
    await Promise.all(
      wanted.map(async (n) => {
        try {
          const c = NoticeContent.parse(await fetchJson(`${n.contentPrefix[0]}en.json`));
          contents.set(n.id, htmlToText(c.textContent));
        } catch (err) {
          // One missing notice body only downgrades that item to unverified.
          console.warn(`kuro:wuwa notice ${n.id} content: ${(err as Error).message}`);
        }
      }),
    );
    return normalizeKuro(raw, contents);
  },
};
