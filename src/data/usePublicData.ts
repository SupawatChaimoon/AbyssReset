/**
 * Loads the pre-built public JSON (never an external API, NFR-03). A good copy is
 * cached in Local Storage so the calendar still works when a load fails (FR-10).
 */
import { useCallback, useEffect, useState } from 'react';
import { GameEventSchema, SyncStatusSchema, type GameEvent, type SyncStatus } from '../../shared/schema';

const CACHE_KEY = 'abyssreset:cache:v1';

export type PublicData = {
  events: GameEvent[];
  status: SyncStatus | null;
  loading: boolean;
  /** Set when the latest load failed; data may then come from the cache. */
  error: string | null;
  cachedAt: string | null;
  reload: () => void;
};

type Cache = { saved_at: string; events: GameEvent[]; status: SyncStatus | null };

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cache;
    return { ...c, events: parseEvents({ events: c.events }), status: SyncStatusSchema.safeParse(c.status).data ?? null };
  } catch {
    return null;
  }
}

function writeCache(c: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* quota or disabled storage: caching is best effort */
  }
}

/** Keeps every valid event even if a few are malformed. */
export function parseEvents(json: unknown): GameEvent[] {
  const list = (json as { events?: unknown })?.events;
  if (!Array.isArray(list)) throw new Error('events.json ไม่มีรายการ events');
  const out: GameEvent[] = [];
  for (const raw of list) {
    const r = GameEventSchema.safeParse(raw);
    if (r.success) out.push(r.data);
    else console.warn('Skipped invalid event', raw, r.error.issues);
  }
  return out;
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export function usePublicData(): PublicData {
  const [state, setState] = useState<Omit<PublicData, 'reload'>>(() => {
    const cache = readCache();
    return {
      events: cache?.events ?? [],
      status: cache?.status ?? null,
      loading: true,
      error: null,
      cachedAt: null,
    };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const [eventsJson, statusJson] = await Promise.all([
          fetchJson('data/events.json'),
          fetchJson('data/sync-status.json').catch(() => null),
        ]);
        const events = parseEvents(eventsJson);
        const status = SyncStatusSchema.safeParse(statusJson).data ?? null;
        if (cancelled) return;
        writeCache({ saved_at: new Date().toISOString(), events, status });
        setState({ events, status, loading: false, error: null, cachedAt: null });
      } catch (err) {
        if (cancelled) return;
        const cache = readCache();
        setState((s) => ({
          events: cache?.events ?? s.events,
          status: cache?.status ?? s.status,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
          cachedAt: cache?.saved_at ?? null,
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
