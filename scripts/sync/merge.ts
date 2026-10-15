import type { GameEvent } from '../../shared/schema';
import type { FreshEvent } from './adapters/types';

export type MergeResult = { events: GameEvent[]; added: number; updated: number; unchanged: number };

/** JSON with sorted keys and no undefined values, so field order never counts as a change. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

const content = (e: GameEvent | FreshEvent) => {
  const { first_seen_at: _f, last_synced_at: _l, ...rest } = e as GameEvent;
  return stableStringify(rest);
};

/**
 * Merges one source's fresh items into its previous items.
 * - `accumulate`: items the source no longer lists are kept (Ennead and Kuro only list current events).
 * - `replace`: the fresh list is the whole truth (the manual file).
 * Matching is by id, so re-running never creates duplicates.
 */
export function mergeSource(
  previous: GameEvent[],
  fresh: FreshEvent[],
  now: string,
  mode: 'accumulate' | 'replace',
): MergeResult {
  const prevById = new Map(previous.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const events: GameEvent[] = [];
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const f of fresh) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    const old = prevById.get(f.id);
    if (!old) {
      events.push({ ...f, first_seen_at: now, last_synced_at: now });
      added++;
    } else if (content(old) === content(f)) {
      events.push(old);
      unchanged++;
    } else {
      events.push({ ...f, first_seen_at: old.first_seen_at, last_synced_at: now });
      updated++;
    }
  }
  if (mode === 'accumulate') for (const old of previous) if (!seen.has(old.id)) events.push(old);
  return { events, added, updated, unchanged };
}

/** By start time (undated last), then id, so the output order is stable. */
export function sortEvents(events: GameEvent[]): GameEvent[] {
  return [...events].sort(
    (a, b) =>
      (a.start_at ?? '9999').localeCompare(b.start_at ?? '9999') || a.id.localeCompare(b.id),
  );
}
