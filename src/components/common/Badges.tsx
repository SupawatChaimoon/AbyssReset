import type { GameId } from '../../../shared/schema';
import { STATUS_HINT, STATUS_LABEL, TYPE_LABEL } from '../../i18n/th';
import { GAME_STYLE, gameColor, gameName } from '../../lib/gameMeta';
import type { Category, ItemStatus } from '../../lib/items';
import { CategoryIcon, IconQuestion } from '../icons';

export function GameDot({ game, size = 8 }: { game: GameId | null; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: gameColor(game), boxShadow: `0 0 10px ${gameColor(game)}66` }}
    />
  );
}

/** Square tile with the game's short code, used as the game "icon". */
export function GameTile({ game, size = 'md' }: { game: GameId | null; size?: 'sm' | 'md' | 'lg' }) {
  const color = gameColor(game);
  const dims = size === 'sm' ? 'h-6 w-6 text-[9px] rounded-md' : size === 'lg' ? 'h-11 w-11 text-xs rounded-xl' : 'h-8 w-8 text-[10px] rounded-lg';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-bold tracking-wide ${dims}`}
      style={{ background: `color-mix(in oklab, ${color} 20%, transparent)`, color, boxShadow: `inset 0 0 0 1px ${color}40` }}
      title={gameName(game)}
    >
      {game ? GAME_STYLE[game].short : 'ME'}
    </span>
  );
}

export function TypeBadge({ category, label }: { category: Category; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/6 px-1.5 py-0.5 text-[11px] font-medium text-muted">
      <CategoryIcon category={category} size={12} />
      {label ?? TYPE_LABEL[category]}
    </span>
  );
}

const STATUS_STYLE: Record<ItemStatus, string> = {
  confirmed: 'bg-ok/12 text-ok',
  estimated: 'bg-warn/12 text-warn border border-dashed border-warn/50',
  unverified: 'bg-white/8 text-muted',
  cancelled: 'bg-danger/12 text-danger line-through',
  personal: 'bg-mine/15 text-mine',
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}
      title={STATUS_HINT[status]}
    >
      {status === 'unverified' && <IconQuestion size={11} />}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ManualBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-accent/12 px-1.5 py-0.5 text-[11px] font-medium text-accent" title="ผู้ดูแลเว็บกรอกข้อมูลนี้เองจากประกาศทางการ">
      กรอกโดยผู้ดูแล
    </span>
  );
}
