import { isSameDay, isSameMonth } from 'date-fns';
import { useMemo, type CSSProperties } from 'react';
import { WEEKDAYS_SHORT } from '../../i18n/th';
import { formatDayLong } from '../../lib/dates';
import { gameColor } from '../../lib/gameMeta';
import type { CalendarItem } from '../../lib/items';
import { layoutMonth, type Segment } from '../../lib/monthLayout';
import { CategoryIcon, IconQuestion } from '../icons';

const MAX_LANES = 6;

type Props = {
  month: Date;
  items: CalendarItem[];
  now: Date;
  onSelect: (item: CalendarItem) => void;
  onDay: (date: Date, items: CalendarItem[]) => void;
};

export function MonthView({ month, items, now, onSelect, onDay }: Props) {
  const weeks = useMemo(() => layoutMonth(month, items, MAX_LANES), [month, items]);

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line bg-white/[0.02]">
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} className={`py-2 text-center text-[11px] font-medium tracking-wide ${i === 0 ? 'text-danger/80' : 'text-faint'}`}>
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div
          key={wi}
          className="month-week relative grid grid-cols-7 border-b border-line last:border-b-0"
          style={{ gridTemplateRows: `1.9rem repeat(${MAX_LANES}, var(--lane)) 1.35rem` } as CSSProperties}
        >
          {week.days.map((day, c) => {
            const inMonth = isSameMonth(day, month);
            const today = isSameDay(day, now);
            const count = week.dayItems[c].length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onDay(day, week.dayItems[c])}
                aria-label={`${formatDayLong(day)} ${count ? `${count} รายการ` : 'ไม่มีรายการ'}`}
                className={[
                  'relative z-0 border-l border-line text-left transition-colors first:border-l-0 hover:bg-white/[0.035]',
                  inMonth ? '' : 'bg-black/25',
                  today ? 'bg-accent/[0.06]' : '',
                ].join(' ')}
                style={{ gridColumn: c + 1, gridRow: '1 / -1' }}
              >
                <span
                  className={[
                    'absolute top-1.5 left-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium',
                    today ? 'bg-accent-strong text-white shadow-[0_0_14px_rgb(109_124_255/0.6)]' : inMonth ? 'text-fg/85' : 'text-faint/70',
                  ].join(' ')}
                >
                  {day.getDate()}
                </span>
              </button>
            );
          })}

          {week.segments.map((seg) => (
            <Bar key={seg.item.key + wi} seg={seg} onSelect={onSelect} />
          ))}

          {week.hidden.map((n, c) =>
            n > 0 ? (
              <button
                key={`more-${c}`}
                type="button"
                onClick={() => onDay(week.days[c], week.dayItems[c])}
                className="relative z-10 mx-1 self-center truncate rounded px-1 text-left text-[10px] font-medium text-muted hover:bg-white/8 hover:text-fg sm:text-[11px]"
                style={{ gridColumn: c + 1, gridRow: MAX_LANES + 2 }}
              >
                +{n}
                <span className="hidden sm:inline"> เพิ่มเติม</span>
              </button>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}

function Bar({ seg, onSelect }: { seg: Segment; onSelect: (item: CalendarItem) => void }) {
  const { item } = seg;
  const openEnd = seg.span.openEnd && seg.isEnd;
  return (
    <button
      type="button"
      className="bar z-10 my-px"
      data-status={item.status}
      data-cont-left={seg.contLeft || seg.span.openStart}
      data-cont-right={seg.contRight}
      data-open-end={openEnd}
      title={item.title}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item);
      }}
      style={
        {
          '--g': gameColor(item.game_id),
          gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`,
          gridRow: seg.lane + 2,
          marginLeft: seg.contLeft ? 0 : 3,
          marginRight: seg.contRight || openEnd ? 0 : 3,
        } as CSSProperties
      }
    >
      <span className="hidden shrink-0 sm:inline-flex">
        <CategoryIcon category={item.category} size={11} strokeWidth={2.4} />
      </span>
      <span className="hidden truncate sm:inline">{item.title}</span>
      {item.status === 'unverified' && (
        <span className="ml-auto hidden shrink-0 sm:inline-flex" aria-label="ยังตรวจสอบไม่ได้">
          <IconQuestion size={11} />
        </span>
      )}
    </button>
  );
}
