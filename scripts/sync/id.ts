import { createHash } from 'node:crypto';
import type { EventType, GameId } from '../../shared/schema';

/**
 * Stable id: `{game}:{type}:{raw id}` when the source gives one, so a changed
 * date updates the same item. Otherwise a hash of the title and start day.
 */
export function makeId(
  game_id: GameId,
  type: EventType,
  raw_source_id: string | undefined,
  title: string,
  start_at: string | null,
): string {
  if (raw_source_id) return `${game_id}:${type}:${raw_source_id}`;
  const key = title.toLowerCase().replace(/\s+/g, '') + '|' + (start_at?.slice(0, 10) ?? '');
  return `${game_id}:${type}:` + createHash('sha1').update(key).digest('hex').slice(0, 12);
}
