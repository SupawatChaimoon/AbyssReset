import type { CSSProperties } from 'react';
import { SUBTYPE_LABEL } from '../../i18n/th';
import { formatTime, phaseOf, relativeLabel } from '../../lib/dates';
import { gameColor, gameName } from '../../lib/gameMeta';
import type { CalendarItem } from '../../lib/items';
import type { AgendaRole } from '../../lib/agenda';
import { GameTile, ManualBadge, StatusBadge, TypeBadge } from '../common/Badges';

const ROLE_LABEL: Record<AgendaRole, string> = { start: 'เริ่ม', end: 'สิ้นสุด', single: '' };

/** One clickable row used by the agenda and the day list. */
export function ItemRow({
  item,
  now,
  role,
  onSelect,
}: {
  item: CalendarItem;
  now: Date;
  role?: AgendaRole;
  onSelect: (item: CalendarItem) => void;
}) {
  const phase = phaseOf(item.start, item.end, now);
  const at = role === 'end' ? item.end : item.start;
  const timeText = item.all_day || !at ? 'ทั้งวัน' : formatTime(at);
  const subLabel = item.personal?.label ?? (item.event?.subtype ? SUBTYPE_LABEL[item.event.subtype] : undefined);
  const urgent = phase === 'active' && item.end && item.end.getTime() - now.getTime() < 3 * 86_400_000;
  const countdown = relativeLabel(item.start, item.end, now);
  const countdownColor = urgent ? 'text-warn' : phase === 'upcoming' ? 'text-accent' : 'text-muted';

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${phase === 'ended' ? 'opacity-55' : ''}`}
      style={{ '--g': gameColor(item.game_id) } as CSSProperties}
    >
      {role !== undefined && (
        <div className="w-11 shrink-0 text-right">
          <div className="text-xs font-medium tabular-nums text-fg/90">{timeText}</div>
          {ROLE_LABEL[role] && (
            <div className={`text-[10px] font-medium ${role === 'end' ? 'text-danger/80' : 'text-ok/80'}`}>{ROLE_LABEL[role]}</div>
          )}
        </div>
      )}
      <span className="swatch h-9! w-1! rounded-full!" data-status={item.status} data-open-end={!item.end && !!item.start} />
      <GameTile game={item.game_id} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-fg group-hover:text-white">{item.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          <TypeBadge category={item.category} label={subLabel} />
          {item.status !== 'confirmed' && <StatusBadge status={item.status} />}
          {item.manual && <ManualBadge />}
          <span className="hidden sm:inline">· {item.game_id ? gameName(item.game_id) : 'ไม่ระบุเกม'}</span>
          <span className={`sm:hidden ${countdownColor}`}>{countdown}</span>
        </div>
      </div>
      <div className={`hidden shrink-0 text-right text-xs font-medium sm:block ${countdownColor}`}>{countdown}</div>
    </button>
  );
}
