import { z } from 'zod';
import { GAMES, SUPPORTED_TYPES } from '../../shared/games';
import { ManualEventSchema } from '../../shared/schema';
import type { FreshEvent } from './adapters/types';
import { makeId } from './id';

export const MANUAL_SOURCE_ID = 'manual';
export const MANUAL_SOURCE_NAME = 'กรอกโดยผู้ดูแล';

const toUtc = (s: string | null) => (s ? new Date(s).toISOString() : null);

/**
 * Converts data-manual/manual-events.json. Throws if the file is malformed.
 * Entries for a game+type the automatic source already covers are skipped with a warning.
 */
export function normalizeManual(raw: unknown): { events: FreshEvent[]; warnings: string[] } {
  const entries = z.array(ManualEventSchema).parse(raw);
  const events: FreshEvent[] = [];
  const warnings: string[] = [];
  for (const m of entries) {
    if (SUPPORTED_TYPES[m.game_id].includes(m.type)) {
      warnings.push(`skipped "${m.title}": ${m.game_id} ${m.type} already comes from the automatic source`);
      continue;
    }
    const start_at = toUtc(m.start_at);
    const end_at = toUtc(m.end_at);
    events.push({
      id: makeId(m.game_id, m.type, undefined, `manual:${m.title}`, start_at),
      source_id: MANUAL_SOURCE_ID,
      game_id: m.game_id,
      type: m.type,
      title: m.title,
      start_at,
      end_at,
      all_day: false,
      timezone: GAMES[m.game_id].timezone,
      region: m.region,
      // A manual date is only trusted when it links to where it came from.
      status: m.source_url && start_at && end_at ? 'confirmed' : 'unverified',
      source_name: MANUAL_SOURCE_NAME,
      source_url: m.source_url,
    });
  }
  return { events, warnings };
}
