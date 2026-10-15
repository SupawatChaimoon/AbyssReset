import type { EventType, GameEvent, GameId } from '../../../shared/schema';

/** What an adapter produces. The merge step adds first_seen_at / last_synced_at. */
export type FreshEvent = Omit<GameEvent, 'first_seen_at' | 'last_synced_at'>;

export interface SourceAdapter {
  id: string;
  game_id: GameId;
  supported_types: EventType[];
  /** Fetch and convert. Throws if the source is down or its format changed. */
  load(): Promise<FreshEvent[]>;
}

export async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'AbyssReset-sync (+https://abyss-reset.vercel.app)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

export const toIso = (seconds: number | null | undefined): string | null =>
  seconds ? new Date(seconds * 1000).toISOString() : null;
