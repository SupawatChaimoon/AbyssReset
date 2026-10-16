import { addMonths, format, isSameMonth, startOfMonth } from 'date-fns';
import { useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { EVENT_TYPES, type GameId } from '../../shared/schema';
import { AgendaView } from '../components/calendar/AgendaView';
import { ItemRow } from '../components/calendar/ItemRow';
import { MonthView } from '../components/calendar/MonthView';
import { EmptyState, Notice } from '../components/common/EmptyState';
import { Sheet } from '../components/common/Sheet';
import { SyncStatusBar, SyncWarnings } from '../components/common/SyncStatusBar';
import { FilterControls, countActiveFilters } from '../components/filters/FilterControls';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconInfo,
  IconList,
  IconPlus,
  IconQuestion,
} from '../components/icons';
import { usePersonal } from '../data/PersonalContext';
import { usePublic } from '../data/PublicDataContext';
import { useUI } from '../data/UIContext';
import { useLocalState } from '../hooks/useLocalState';
import { useMediaQuery, useNow } from '../hooks/useNow';
import { TYPE_LABEL } from '../i18n/th';
import { formatDayLong, formatMonthTitle, toDateInput } from '../lib/dates';
import { ALL_TYPES, applyFilters, type Filters, type TimeFilter } from '../lib/filters';
import { GAMES, GAME_IDS, GAME_STYLE, SUPPORTED_TYPES } from '../lib/gameMeta';
import { compareItems, fromEvent, fromPersonal, spanOf, type CalendarItem, type Category } from '../lib/items';

type Prefs = { types: Category[]; time: TimeFilter };
const DEFAULT_PREFS: Prefs = { types: ALL_TYPES, time: 'all' };
const isPrefs = (v: unknown): v is Prefs =>
  !!v &&
  Array.isArray((v as Prefs).types) &&
  (v as Prefs).types.every((t) => ALL_TYPES.includes(t)) &&
  ['all', 'active', 'upcoming', 'ending'].includes((v as Prefs).time);

function parseMonth(s: string | null, fallback: Date): Date {
  const m = s?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return fallback;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default function CalendarPage() {
  const now = useNow();
  const data = usePublic();
  const { store, dispatch } = usePersonal();
  const { select, openEditor } = useUI();
  const isWide = useMediaQuery('(min-width: 768px)');
  const [params, setParams] = useSearchParams();
  const month = parseMonth(params.get('m'), startOfMonth(now));
  const setMonth = (d: Date) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (isSameMonth(d, now)) next.delete('m');
      else next.set('m', format(d, 'yyyy-MM'));
      return next;
    });

  const [prefs, setPrefs] = useLocalState<Prefs>('abyssreset:ui:filters', DEFAULT_PREFS, isPrefs);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [day, setDay] = useState<{ date: Date; items: CalendarItem[] } | null>(null);

  const { followed_games: followed, hidden_games: hidden, default_view } = store.settings;
  const view = default_view === 'auto' ? (isWide ? 'month' : 'agenda') : default_view;
  const filters: Filters = { games: followed.filter((g) => !hidden.includes(g)), types: prefs.types, time: prefs.time };

  const setFilters = (f: Filters) => {
    setPrefs({ types: f.types, time: f.time });
    const nextHidden = followed.filter((g) => !f.games.includes(g));
    if (nextHidden.join() !== hidden.join()) dispatch({ type: 'settings', patch: { hidden_games: nextHidden } });
  };
  const clearFilters = () => setFilters({ games: followed, types: ALL_TYPES, time: 'all' });

  const allItems = useMemo(
    () => [...data.events.map(fromEvent), ...fromPersonal(store)].sort(compareItems),
    [data.events, store],
  );
  // Time filters use "now" only to the minute, so recompute at most once a minute.
  const shown = useMemo(() => applyFilters(allItems, filters, now), [allItems, filters.games.join(), filters.types.join(), filters.time, now]);

  const inMonth = useMemo(() => {
    const first = startOfMonth(month).getTime();
    const last = addMonths(month, 1).getTime() - 1;
    return shown.filter((i) => {
      const s = spanOf(i);
      return s && s.from.getTime() <= last && s.to.getTime() >= first;
    });
  }, [shown, month]);
  const undated = useMemo(() => shown.filter((i) => !i.start && !i.end), [shown]);

  /** Types that some shown game's source never provides and nobody has entered by hand (FR-10). */
  const missing = useMemo(() => {
    const out: Partial<Record<Category, GameId[]>> = {};
    for (const t of EVENT_TYPES) {
      const games = filters.games.filter(
        (g) => !SUPPORTED_TYPES[g].includes(t) && !data.events.some((e) => e.game_id === g && e.type === t),
      );
      if (games.length) out[t] = games;
    }
    return out;
  }, [filters.games.join(), data.events]);
  const missingShown = (Object.entries(missing) as [Category, GameId[]][]).filter(([t]) => filters.types.includes(t));

  const activeCount = countActiveFilters(filters, followed);

  if (!followed.length) {
    return (
      <div className="panel">
        <EmptyState icon={<IconCalendar size={26} />} title="เลือกเกมที่คุณเล่น" action={<WelcomePicker onPick={(g) => dispatch({ type: 'settings', patch: { followed_games: g, hidden_games: [] } })} />}>
          ปฏิทินจะแสดงตู้ แพตช์ Endgame และกิจกรรมของเกมที่เลือก เปลี่ยนได้ภายหลังในหน้าตั้งค่า
        </EmptyState>
      </div>
    );
  }

  const isCurrent = isSameMonth(month, now);
  const loadingFirst = data.loading && !data.events.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost h-9 w-9 px-0" onClick={() => setMonth(addMonths(month, -1))} aria-label="เดือนก่อนหน้า">
            <IconChevronLeft size={18} />
          </button>
          <h1 className="min-w-36 text-center text-xl font-bold tracking-tight sm:min-w-44 sm:text-2xl" aria-live="polite">
            {formatMonthTitle(month)}
          </h1>
          <button type="button" className="btn btn-ghost h-9 w-9 px-0" onClick={() => setMonth(addMonths(month, 1))} aria-label="เดือนถัดไป">
            <IconChevronRight size={18} />
          </button>
        </div>
        <button type="button" className="btn btn-soft h-8 text-xs" onClick={() => setMonth(startOfMonth(now))} disabled={isCurrent}>
          วันนี้
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn btn-soft relative md:hidden" onClick={() => setFiltersOpen(true)}>
            <IconFilter size={15} /> ตัวกรอง
            {activeCount > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] text-white">{activeCount}</span>
            )}
          </button>
          <div className="flex rounded-xl border border-line bg-ink-900/60 p-0.5" role="radiogroup" aria-label="มุมมอง">
            {(
              [
                ['month', 'รายเดือน', <IconCalendar key="c" size={15} />],
                ['agenda', 'รายการ', <IconList key="l" size={15} />],
              ] as const
            ).map(([v, label, icon]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => dispatch({ type: 'settings', patch: { default_view: v } })}
                className={`flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium transition-colors ${view === v ? 'bg-white/10 text-fg' : 'text-faint hover:text-muted'}`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary h-9 w-9 px-0 sm:w-auto sm:px-3" onClick={() => openEditor({ kind: 'personal_event' })} aria-label="เพิ่มรายการของฉัน">
            <IconPlus size={16} />
            <span className="hidden sm:inline">เพิ่มรายการ</span>
          </button>
        </div>
      </div>

      {/* Filters (desktop inline, mobile sheet) */}
      <div className="hidden items-center gap-3 md:flex">
        <FilterControls filters={filters} followed={followed} missing={missing} onChange={setFilters} layout="inline" />
        {activeCount > 0 && (
          <button type="button" className="btn btn-ghost h-8 text-xs" onClick={clearFilters}>
            ล้างตัวกรอง
          </button>
        )}
      </div>
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={<h2 className="text-lg font-semibold">ตัวกรอง</h2>}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={clearFilters} disabled={!activeCount}>
              ล้างตัวกรอง
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setFiltersOpen(false)}>
              ดู {shown.length} รายการ
            </button>
          </>
        }
      >
        <FilterControls filters={filters} followed={followed} missing={missing} onChange={setFilters} layout="stacked" />
      </Sheet>

      <SyncWarnings data={data} />

      {missingShown.length > 0 && filters.time === 'all' && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <IconInfo size={14} className="mt-0.5 shrink-0" />
          <span>
            {missingShown.map(([t, games], i) => (
              <span key={t}>
                {i > 0 && ' · '}
                ยังไม่มีข้อมูล<b className="font-medium text-fg/80">{TYPE_LABEL[t]}</b>ของ {games.map((g) => GAME_STYLE[g].short).join(', ')}
              </span>
            ))}{' '}
            เพราะแหล่งข้อมูลอัตโนมัติยังไม่รองรับ ผู้ดูแลจะกรอกเมื่อมีประกาศทางการ
          </span>
        </p>
      )}

      {/* Calendar body */}
      {loadingFirst ? (
        <CalendarSkeleton />
      ) : !data.events.length && data.error ? (
        <div className="panel">
          <EmptyState icon={<IconQuestion size={26} />} title="โหลดข้อมูลกิจกรรมไม่ได้" action={<button type="button" className="btn btn-primary" onClick={data.reload}>ลองใหม่</button>}>
            ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง รายการของฉันยังดูได้ในหน้า "ของฉัน"
          </EmptyState>
        </div>
      ) : (
        <>
          {view === 'month' ? (
            <MonthView month={month} items={shown} now={now} onSelect={select} onDay={(date, items) => setDay({ date, items })} />
          ) : (
            <AgendaView month={month} items={shown} now={now} onSelect={select} />
          )}
          {!inMonth.length && (
            <div className="panel">
              {activeCount > 0 ? (
                <EmptyState icon={<IconFilter size={24} />} title="ไม่มีกิจกรรมที่ตรงกับตัวกรอง" action={<button type="button" className="btn btn-soft" onClick={clearFilters}>ล้างตัวกรอง</button>}>
                  ลองเลือกเกมหรือประเภทเพิ่ม หรือเปลี่ยนช่วงเวลาเป็น "ทั้งหมด"
                </EmptyState>
              ) : (
                <EmptyState icon={<IconCalendar size={24} />} title="ยังไม่มีกิจกรรมในเดือนนี้">
                  ข้อมูลของเดือนที่ยังมาไม่ถึงจะปรากฏเมื่อเกมประกาศ ระบบดึงข้อมูลใหม่ทุก 6 ชั่วโมง
                </EmptyState>
              )}
            </div>
          )}
        </>
      )}

      {undated.length > 0 && (
        <section className="panel p-2">
          <h3 className="flex items-center gap-2 px-3 pt-2 pb-1 text-xs font-semibold text-muted">
            <IconQuestion size={14} /> ยังไม่ระบุวันที่ ({undated.length})
          </h3>
          <p className="px-3 pb-1 text-[11px] text-faint">แหล่งข้อมูลยังไม่ให้วันเริ่มและวันสิ้นสุด จึงยังวางในปฏิทินไม่ได้</p>
          {undated.map((item) => (
            <ItemRow key={item.key} item={item} now={now} onSelect={select} />
          ))}
        </section>
      )}

      <Legend />
      <SyncStatusBar data={data} />

      <Sheet
        open={!!day}
        onClose={() => setDay(null)}
        title={
          day && (
            <div>
              <h2 className="text-lg font-semibold">{formatDayLong(day.date)}</h2>
              <p className="text-xs text-muted">{day.items.length ? `${day.items.length} รายการ` : 'ไม่มีรายการ'}</p>
            </div>
          )
        }
        footer={
          day && (
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                const date = toDateInput(day.date);
                setDay(null);
                openEditor({ kind: 'personal_event', date });
              }}
            >
              <IconPlus size={15} /> เพิ่มรายการส่วนตัววันนี้
            </button>
          )
        }
      >
        {day && (
          <div className="-mx-3">
            {day.items.length ? (
              day.items.map((item) => (
                <ItemRow
                  key={item.key}
                  item={item}
                  now={now}
                  onSelect={(i) => {
                    setDay(null);
                    select(i);
                  }}
                />
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted">วันนี้ยังไม่มีกิจกรรมที่ตรงกับตัวกรอง</p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Legend() {
  const g = { '--g': 'var(--color-accent)' } as CSSProperties;
  const items: [string, string, boolean?][] = [
    ['confirmed', 'ยืนยันแล้ว'],
    ['unverified', 'ยังตรวจสอบไม่ได้'],
    ['estimated', 'ประมาณการ'],
    ['confirmed', 'ยังไม่ประกาศวันสิ้นสุด', true],
    ['personal', 'ของฉัน'],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11px] text-muted">
      {GAME_IDS.map((id) => (
        <span key={id} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: GAME_STYLE[id].color }} />
          {GAMES[id].name}
        </span>
      ))}
      <span className="hidden h-3 w-px bg-line sm:inline-block" />
      {items.map(([status, label, open]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="swatch h-2.5! w-5!" data-status={status} data-open-end={open ?? false} style={g} />
          {label}
        </span>
      ))}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="panel animate-pulse overflow-hidden" aria-busy="true" aria-label="กำลังโหลด">
      <div className="h-8 border-b border-line bg-white/[0.02]" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="grid h-24 grid-cols-7 border-b border-line last:border-0">
          {Array.from({ length: 7 }, (_, j) => (
            <div key={j} className="border-l border-line p-2 first:border-0">
              <div className="h-3 w-4 rounded bg-white/6" />
              {(i + j) % 3 === 0 && <div className="mt-3 h-3 rounded bg-white/6" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function WelcomePicker({ onPick }: { onPick: (games: GameId[]) => void }) {
  const [picked, setPicked] = useState<GameId[]>([...GAME_IDS]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {GAME_IDS.map((g) => {
          const on = picked.includes(g);
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(on ? picked.filter((x) => x !== g) : [...picked, g])}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${on ? 'border-white/25 bg-white/8' : 'border-line text-muted'}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? GAME_STYLE[g].color : 'var(--color-faint)' }} />
              {GAMES[g].name}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn btn-primary w-full" disabled={!picked.length} onClick={() => onPick(picked)}>
        เริ่มใช้งาน
      </button>
    </div>
  );
}
