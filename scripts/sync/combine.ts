import { z } from 'zod';
import type { GameEvent, SourceStatus } from '../../shared/schema';
import type { FreshEvent } from './adapters/types';
import { mergeSource, sortEvents } from './merge';

export type Outcome = {
  id: string;
  game_id: SourceStatus['game_id'];
  supported: SourceStatus['supported_types'];
  mode: 'accumulate' | 'replace';
  result: PromiseSettledResult<FreshEvent[]>;
};

const describe = (reason: unknown) =>
  reason instanceof z.ZodError ? 'unexpected data format\n' + z.prettifyError(reason)
  : reason instanceof Error ? reason.message
  : String(reason);

/**
 * Applies every source's result to the previous events.
 * A failed source keeps all of its previous items untouched.
 */
export function combine(previous: GameEvent[], outcomes: Outcome[], prevSources: SourceStatus[], now: string) {
  const known = new Set(outcomes.map((o) => o.id));
  // Items from a source that no longer exists are left alone.
  const events: GameEvent[] = previous.filter((e) => !known.has(e.source_id));
  const sources: SourceStatus[] = [];
  const log: string[] = [];

  for (const o of outcomes) {
    const prevItems = previous.filter((e) => e.source_id === o.id);
    const base = { source_id: o.id, game_id: o.game_id, last_attempt_at: now, supported_types: o.supported };
    if (o.result.status === 'fulfilled') {
      const r = mergeSource(prevItems, o.result.value, now, o.mode);
      events.push(...r.events);
      log.push(`${o.id.padEnd(16)} ok   +${r.added} ~${r.updated} =${r.unchanged} total:${r.events.length}`);
      sources.push({ ...base, ok: true, last_success_at: now, item_count: r.events.length });
    } else {
      const error = describe(o.result.reason);
      events.push(...prevItems);
      log.push(`${o.id.padEnd(16)} FAIL kept ${prevItems.length} previous items: ${error}`);
      const last_success_at = prevSources.find((s) => s.source_id === o.id)?.last_success_at ?? null;
      sources.push({ ...base, ok: false, last_success_at, error, item_count: prevItems.length });
    }
  }
  return { events: sortEvents(events), sources, log };
}
