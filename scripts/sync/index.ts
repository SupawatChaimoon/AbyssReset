/**
 * npm run sync
 * Fetches every source, merges with the previous public/data/events.json and
 * writes it back only if something changed. A failed source keeps its old items.
 *
 * SYNC_FAIL=ennead:genshin,kuro:wuwa,manual makes those sources fail, to test that path.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SUPPORTED_TYPES } from '../../shared/games';
import {
  EVENT_TYPES,
  EventsFileSchema,
  GameEventSchema,
  SyncStatusSchema,
  type SourceStatus,
} from '../../shared/schema';
import { enneadAdapter } from './adapters/ennead';
import { kuroAdapter } from './adapters/kuro-notice';
import type { FreshEvent, SourceAdapter } from './adapters/types';
import { combine, type Outcome } from './combine';
import { MANUAL_SOURCE_ID, normalizeManual } from './manual';
import { stableStringify } from './merge';

const root = fileURLToPath(new URL('../../', import.meta.url));
const EVENTS_PATH = root + 'public/data/events.json';
const STATUS_PATH = root + 'public/data/sync-status.json';
const MANUAL_PATH = root + 'data-manual/manual-events.json';

const adapters: SourceAdapter[] = [
  enneadAdapter('genshin'),
  enneadAdapter('starrail'),
  enneadAdapter('zenless'),
  kuroAdapter,
];
const forcedFailures = new Set((process.env.SYNC_FAIL ?? '').split(',').filter(Boolean));
const FreshSchema = GameEventSchema.omit({ first_seen_at: true, last_synced_at: true }).array();

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const toJson = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

async function settle(id: string, load: () => Promise<FreshEvent[]> | FreshEvent[]): Promise<PromiseSettledResult<FreshEvent[]>> {
  try {
    if (forcedFailures.has(id)) throw new Error('forced by SYNC_FAIL');
    // Adapter output must match the shared schema, or the source counts as failed.
    return { status: 'fulfilled', value: FreshSchema.parse(await load()) as FreshEvent[] };
  } catch (reason) {
    return { status: 'rejected', reason };
  }
}

async function main() {
  const now = new Date().toISOString();
  // A corrupt events.json throws here, so it is never overwritten with less data.
  const previous = existsSync(EVENTS_PATH) ? EventsFileSchema.parse(readJson(EVENTS_PATH)).events : [];
  const prevStatus = existsSync(STATUS_PATH) ? SyncStatusSchema.parse(readJson(STATUS_PATH)) : null;

  const outcomes: Outcome[] = await Promise.all(
    adapters.map(async (a) => ({
      id: a.id,
      game_id: a.game_id,
      supported: a.supported_types,
      mode: 'accumulate' as const,
      result: await settle(a.id, () => a.load()),
    })),
  );
  outcomes.push({
    id: MANUAL_SOURCE_ID,
    game_id: null,
    // Types that at least one game's automatic source does not cover.
    supported: EVENT_TYPES.filter((t) => Object.values(SUPPORTED_TYPES).some((s) => !s.includes(t))),
    mode: 'replace',
    result: await settle(MANUAL_SOURCE_ID, () => {
      const { events, warnings } = normalizeManual(existsSync(MANUAL_PATH) ? readJson(MANUAL_PATH) : []);
      for (const w of warnings) console.warn(`manual: ${w}`);
      return events;
    }),
  });

  const { events, sources, log } = combine(previous, outcomes, prevStatus?.sources ?? [], now);
  for (const line of log) (line.includes(' FAIL ') ? console.error : console.log)(line);

  const eventsJson = toJson(EventsFileSchema.parse({ schema_version: 1, events }));
  const eventsChanged = !existsSync(EVENTS_PATH) || readFileSync(EVENTS_PATH, 'utf8') !== eventsJson;
  if (eventsChanged) writeFileSync(EVENTS_PATH, eventsJson);

  // Timestamps alone are not a change; otherwise every run would make a commit.
  const signature = (s: SourceStatus[]) =>
    stableStringify(s.map(({ last_attempt_at: _a, last_success_at: _s, ...rest }) => rest));
  const statusChanged = eventsChanged || !prevStatus || signature(prevStatus.sources) !== signature(sources);
  if (statusChanged) writeFileSync(STATUS_PATH, toJson(SyncStatusSchema.parse({ generated_at: now, sources })));

  console.log(`events.json ${eventsChanged ? 'written' : 'unchanged'}, sync-status.json ${statusChanged ? 'written' : 'unchanged'}`);
  if (sources.filter((s) => s.source_id !== MANUAL_SOURCE_ID).every((s) => !s.ok)) {
    console.error('Every automatic source failed');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
