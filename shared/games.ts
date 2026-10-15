import type { EventType, GameId } from './schema';

export type GameInfo = {
  id: GameId;
  name: string;
  region: 'asia' | 'sea';
  /** IANA zone of the server the dates are for. */
  timezone: string;
  /** Official news page, used as the "open source" link. */
  news_url: string;
};

export const GAMES: Record<GameId, GameInfo> = {
  genshin: {
    id: 'genshin',
    name: 'Genshin Impact',
    region: 'asia',
    timezone: 'Asia/Shanghai',
    news_url: 'https://genshin.hoyoverse.com/en/news',
  },
  starrail: {
    id: 'starrail',
    name: 'Honkai: Star Rail',
    region: 'asia',
    timezone: 'Asia/Shanghai',
    news_url: 'https://hsr.hoyoverse.com/en-us/news',
  },
  zenless: {
    id: 'zenless',
    name: 'Zenless Zone Zero',
    region: 'asia',
    timezone: 'Asia/Shanghai',
    news_url: 'https://zenless.hoyoverse.com/en-us/news',
  },
  wuwa: {
    id: 'wuwa',
    name: 'Wuthering Waves',
    region: 'sea',
    timezone: 'Asia/Singapore',
    news_url: 'https://wutheringwaves.kurogames.com/en/main/news/',
  },
};

/** Types each game's automatic source covers. Manual entries for these are ignored. */
export const SUPPORTED_TYPES: Record<GameId, EventType[]> = {
  // Ennead has no patch dates, and banner start times can't tell first from second half.
  genshin: ['banner', 'endgame', 'event'],
  starrail: ['banner', 'endgame', 'event'],
  zenless: ['banner', 'endgame', 'event'],
  // Kuro notices have no reliable endgame schedule (Tower of Adversity, Whimpering Wastes).
  wuwa: ['patch', 'banner', 'event'],
};

/** Wuthering Waves notice titles (English) that are not calendar items. */
export const WUWA_SKIP_TITLE = [
  /bundle/i,
  /limited-time offer/i,
  /feature details/i,
  /permanent/i,
  /feedback policy/i,
  /fair play/i,
  /known issues/i,
  /community/i,
];

/** Wuthering Waves notice titles that are endgame modes rather than events. */
export const WUWA_ENDGAME_TITLE = [/endstate matrix/i, /tower of adversity/i, /whimpering wastes/i];
