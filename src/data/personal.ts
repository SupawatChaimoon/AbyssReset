/**
 * Personal data kept in Local Storage under one versioned key (FR-08).
 * No payment card or account data is stored, only what the user types (NFR-05).
 */
import { z } from 'zod';
import { GAME_IDS } from '../../shared/schema';

export const STORE_KEY = 'abyssreset:v1';

const day = z.iso.date();
const id = z.string().min(1).max(64);
const note = z.string().max(1000).optional();

export const SubscriptionSchema = z.object({
  id,
  game_id: z.enum(GAME_IDS),
  name: z.string().trim().min(1).max(80),
  price: z.number().nonnegative().max(1_000_000).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  start_date: day,
  end_date: day,
  renewal: z.enum(['auto', 'manual']),
  note,
});

export const BattlePassSchema = z.object({
  id,
  game_id: z.enum(GAME_IDS),
  name: z.string().trim().min(1).max(80),
  start_date: day,
  end_date: day,
  purchased: z.boolean(),
  level: z.number().int().nonnegative().max(10_000).optional(),
  max_level: z.number().int().positive().max(10_000).optional(),
  note,
});

export const PersonalEventSchema = z.object({
  id,
  title: z.string().trim().min(1).max(120),
  game_id: z.enum(GAME_IDS).optional(),
  date: day,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  note,
});

export const SettingsSchema = z.object({
  followed_games: z.array(z.enum(GAME_IDS)).default([...GAME_IDS]),
  hidden_games: z.array(z.enum(GAME_IDS)).default([]),
  default_view: z.enum(['auto', 'month', 'agenda']).default('auto'),
  /** Reserved for per-game server choice; MVP shows Asia/SEA only. */
  region_by_game: z.record(z.string(), z.string()).default({}),
});

export const PersonalStoreSchema = z.object({
  schema_version: z.literal(1),
  settings: SettingsSchema.default(SettingsSchema.parse({})),
  subscriptions: z.array(SubscriptionSchema).default([]),
  battle_passes: z.array(BattlePassSchema).default([]),
  personal_events: z.array(PersonalEventSchema).default([]),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;
export type BattlePass = z.infer<typeof BattlePassSchema>;
export type PersonalEvent = z.infer<typeof PersonalEventSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type PersonalStore = z.infer<typeof PersonalStoreSchema>;

export type PersonalKind = 'subscription' | 'battle_pass' | 'personal_event';
export type PersonalItemOf<K extends PersonalKind> = K extends 'subscription'
  ? Subscription
  : K extends 'battle_pass'
    ? BattlePass
    : PersonalEvent;

export const LIST_OF = {
  subscription: 'subscriptions',
  battle_pass: 'battle_passes',
  personal_event: 'personal_events',
} as const satisfies Record<PersonalKind, keyof PersonalStore>;

export const emptyStore = (): PersonalStore => PersonalStoreSchema.parse({ schema_version: 1 });

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type LoadResult = { store: PersonalStore; problem?: string };

/** Never throws. A corrupt value is copied aside so the user can recover it, then defaults are used. */
export function loadStore(storage: Storage | undefined = safeStorage()): LoadResult {
  if (!storage) return { store: emptyStore(), problem: 'เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกข้อมูล ข้อมูลส่วนตัวจะหายเมื่อปิดหน้า' };
  const raw = storage.getItem(STORE_KEY);
  if (!raw) return { store: emptyStore() };
  try {
    return { store: parseStore(JSON.parse(raw)) };
  } catch {
    try {
      storage.setItem(`${STORE_KEY}:corrupt:${Date.now()}`, raw);
    } catch {
      /* storage full; nothing more we can do */
    }
    return { store: emptyStore(), problem: 'ข้อมูลส่วนตัวที่บันทึกไว้เสียหาย จึงเริ่มใหม่ สำเนาเดิมถูกเก็บแยกไว้ในเบราว์เซอร์' };
  }
}

export function saveStore(store: PersonalStore, storage: Storage | undefined = safeStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

/** Validates and migrates any supported version. Throws a readable Thai message on bad input. */
export function parseStore(value: unknown): PersonalStore {
  const result = PersonalStoreSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path.length ? ` (${issue.path.join('.')})` : '';
    throw new Error(`รูปแบบไฟล์ไม่ถูกต้อง${where}`);
  }
  return result.data;
}

export function exportStore(store: PersonalStore): string {
  return JSON.stringify({ ...store, exported_at: new Date().toISOString(), app: 'AbyssReset' }, null, 2);
}

/** "merge" keeps current settings and items, adding or overwriting by id; "replace" swaps everything. */
export function importStore(current: PersonalStore, incoming: PersonalStore, mode: 'merge' | 'replace'): PersonalStore {
  if (mode === 'replace') return incoming;
  const byId = <T extends { id: string }>(a: T[], b: T[]) => {
    const map = new Map(a.map((x) => [x.id, x]));
    for (const x of b) map.set(x.id, x);
    return [...map.values()];
  };
  return {
    ...current,
    subscriptions: byId(current.subscriptions, incoming.subscriptions),
    battle_passes: byId(current.battle_passes, incoming.battle_passes),
    personal_events: byId(current.personal_events, incoming.personal_events),
  };
}

function safeStorage(): Storage | undefined {
  try {
    const s = globalThis.localStorage;
    const probe = `${STORE_KEY}:probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return undefined;
  }
}
