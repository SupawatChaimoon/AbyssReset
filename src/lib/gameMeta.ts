import { GAMES, SUPPORTED_TYPES } from '../../shared/games';
import { GAME_IDS, type GameId } from '../../shared/schema';

export { GAMES, SUPPORTED_TYPES, GAME_IDS };

/** Display-only data. Colors match the @theme tokens in index.css. */
export const GAME_STYLE: Record<GameId, { color: string; short: string }> = {
  genshin: { color: '#4f9fd8', short: 'GI' },
  starrail: { color: '#9b7be0', short: 'HSR' },
  zenless: { color: '#e8a33c', short: 'ZZZ' },
  wuwa: { color: '#3fb8a5', short: 'WW' },
};

/** Personal items get their own color so they never read as public data. */
export const MINE_COLOR = '#f472b6';

export const gameName = (id: GameId | null | undefined) => (id ? GAMES[id].name : 'ไม่ระบุเกม');
export const gameColor = (id: GameId | null | undefined) => (id ? GAME_STYLE[id].color : MINE_COLOR);
