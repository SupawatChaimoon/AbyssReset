import { z } from 'zod';

export const GAME_IDS = ['genshin', 'starrail', 'zenless', 'wuwa'] as const;
export const EVENT_TYPES = ['banner', 'patch', 'endgame', 'event'] as const;
export const REGIONS = ['asia', 'sea', 'america', 'europe', 'global'] as const;
export const STATUSES = ['confirmed', 'estimated', 'unverified', 'cancelled'] as const;

export type GameId = (typeof GAME_IDS)[number];
export type EventType = (typeof EVENT_TYPES)[number];

/** ISO 8601 in UTC, e.g. 2026-10-13T10:00:00.000Z */
const utc = z.iso.datetime();

export const GameEventSchema = z.object({
  id: z.string().min(1),
  source_id: z.string().min(1),
  game_id: z.enum(GAME_IDS),
  type: z.enum(EVENT_TYPES),
  subtype: z.string().optional(),
  title: z.string().min(1),
  start_at: utc.nullable(),
  end_at: utc.nullable(),
  all_day: z.boolean(),
  timezone: z.string(),
  region: z.enum(REGIONS),
  status: z.enum(STATUSES),
  version: z.string().optional(),
  featured: z
    .array(z.object({ name: z.string(), image_url: z.string().optional(), rarity: z.number().optional() }))
    .optional(),
  source_name: z.string(),
  source_url: z.string().optional(),
  /** When this item's content last changed (not touched when a sync finds it unchanged). */
  last_synced_at: utc,
  first_seen_at: utc,
  image_url: z.string().optional(),
  description: z.string().optional(),
  raw_source_id: z.string().optional(),
});
export type GameEvent = z.infer<typeof GameEventSchema>;

export const EventsFileSchema = z.object({
  schema_version: z.literal(1),
  events: z.array(GameEventSchema),
});
export type EventsFile = z.infer<typeof EventsFileSchema>;

export const SourceStatusSchema = z.object({
  source_id: z.string(),
  game_id: z.enum(GAME_IDS).nullable(),
  ok: z.boolean(),
  last_success_at: utc.nullable(),
  last_attempt_at: utc,
  error: z.string().optional(),
  item_count: z.number(),
  supported_types: z.array(z.enum(EVENT_TYPES)),
});
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const SyncStatusSchema = z.object({
  generated_at: utc,
  sources: z.array(SourceStatusSchema),
});
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

/** One-time entry in data-manual/manual-events.json. Times must include an offset. */
export const ManualEventSchema = z
  .object({
    game_id: z.enum(GAME_IDS),
    type: z.enum(EVENT_TYPES),
    title: z.string().min(1),
    start_at: z.iso.datetime({ offset: true }).nullable(),
    end_at: z.iso.datetime({ offset: true }).nullable(),
    region: z.enum(REGIONS),
    source_url: z.url().optional(),
    note: z.string().optional(),
  })
  .strict();
export type ManualEvent = z.infer<typeof ManualEventSchema>;
