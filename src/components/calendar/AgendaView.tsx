import { isSameDay, isBefore, startOfDay } from 'date-fns';
import { useMemo, useState } from 'react';
import { buildAgenda } from '../../lib/agenda';
import { formatDay } from '../../lib/dates';
import type { CalendarItem } from '../../lib/items';
import { ItemRow } from './ItemRow';

/** Ongoing items are sorted by soonest end, so the first few are the ones to act on. */
const ONGOING_PREVIEW = 4;

type Props = {
  month: Date;
  items: CalendarItem[];
  now: Date;
  onSelect: (item: CalendarItem) => void;
};

export function AgendaView({ month, items, now, onSelect }: Props) {
  const agenda = useMemo(() => buildAgenda(month, items), [month, items]);
  const [showAllOngoing, setShowAllOngoing] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const today = startOfDay(now);
  const pastDays = agenda.days.filter((d) => isBefore(d.date, today)).length;
  // Past days are folded away while something is still ahead in this month.
  const foldPast = !showPast && pastDays > 0 && pastDays < agenda.days.length;
  const days = foldPast ? agenda.days.slice(pastDays) : agenda.days;

  if (!agenda.ongoing.length && !agenda.days.length) return null;

  return (
    <div className="space-y-4">
      {agenda.ongoing.length > 0 && (
        <section className="panel p-2">
          <h3 className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted">
            ดำเนินต่อเนื่องตลอดเดือน <span className="font-normal text-faint">{agenda.ongoing.length} รายการ</span>
          </h3>
          {(showAllOngoing ? agenda.ongoing : agenda.ongoing.slice(0, ONGOING_PREVIEW)).map((item) => (
            <ItemRow key={item.key} item={item} now={now} onSelect={onSelect} />
          ))}
          {agenda.ongoing.length > ONGOING_PREVIEW && (
            <button type="button" className="btn btn-ghost mt-1 w-full text-xs" onClick={() => setShowAllOngoing((v) => !v)}>
              {showAllOngoing ? 'ย่อรายการ' : `แสดงทั้งหมด (${agenda.ongoing.length})`}
            </button>
          )}
        </section>
      )}
      {pastDays > 0 && pastDays < agenda.days.length && (
        <button type="button" className="btn btn-soft w-full text-xs" onClick={() => setShowPast((v) => !v)}>
          {showPast ? 'ซ่อนวันที่ผ่านมาแล้ว' : `แสดงวันที่ผ่านมาแล้ว (${pastDays} วัน)`}
        </button>
      )}
      {days.map((day) => {
        const isToday = isSameDay(day.date, now);
        const past = isBefore(day.date, today);
        return (
          <section
            key={day.date.getTime()}
            className={`panel p-2 ${past ? 'opacity-70' : ''} ${isToday ? 'ring-1 ring-accent/40' : ''}`}
          >
            <h3 className="flex items-center gap-2 px-3 pt-2 pb-1 text-xs font-semibold tracking-wide">
              <span className={isToday ? 'text-accent' : 'text-fg/80'}>{formatDay(day.date)}</span>
              {isToday && <span className="rounded-full bg-accent-strong px-2 py-0.5 text-[10px] text-white">วันนี้</span>}
              <span className="font-normal text-faint">{day.entries.length} รายการ</span>
            </h3>
            {day.entries.map((e) => (
              <ItemRow key={e.item.key + e.role} item={e.item} role={e.role} now={now} onSelect={onSelect} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
