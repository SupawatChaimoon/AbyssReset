import type { CSSProperties } from 'react';
import type { GameId } from '../../../shared/schema';
import { TIME_FILTER_LABEL, TYPE_LABEL } from '../../i18n/th';
import { ALL_TYPES, type Filters, type TimeFilter } from '../../lib/filters';
import { GAMES, GAME_STYLE } from '../../lib/gameMeta';
import type { Category } from '../../lib/items';
import { CategoryIcon, IconCheck } from '../icons';

type Props = {
  filters: Filters;
  followed: GameId[];
  /** Types with no data for some shown games, mapped to those games. */
  missing: Partial<Record<Category, GameId[]>>;
  onChange: (f: Filters) => void;
  layout: 'inline' | 'stacked';
};

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function FilterControls({ filters, followed, missing, onChange, layout }: Props) {
  const stacked = layout === 'stacked';
  const group = stacked ? 'space-y-2' : 'flex items-center gap-2';
  const row = stacked ? 'flex flex-wrap gap-2' : 'flex flex-wrap items-center gap-1.5';
  const heading = stacked ? 'text-xs font-semibold text-muted' : 'sr-only';

  return (
    <div className={stacked ? 'space-y-6' : 'flex flex-wrap items-center gap-x-5 gap-y-3'}>
      <div className={group}>
        <h4 className={heading}>เกม</h4>
        <div className={row} role="group" aria-label="กรองตามเกม">
          {followed.map((g) => {
            const on = filters.games.includes(g);
            const color = GAME_STYLE[g].color;
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...filters, games: toggle(filters.games, g) })}
                className="chip"
                style={
                  {
                    borderColor: on ? `${color}80` : 'var(--color-line)',
                    background: on ? `color-mix(in oklab, ${color} 16%, transparent)` : 'transparent',
                    color: on ? 'var(--color-fg)' : 'var(--color-faint)',
                  } as CSSProperties
                }
              >
                <span className="h-2 w-2 rounded-full" style={{ background: on ? color : 'var(--color-faint)' }} />
                <span className={stacked ? '' : 'hidden lg:inline'}>{GAMES[g].name}</span>
                <span className={stacked ? 'hidden' : 'lg:hidden'}>{GAME_STYLE[g].short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={group}>
        <h4 className={heading}>ประเภท</h4>
        <div className={row} role="group" aria-label="กรองตามประเภท">
          {ALL_TYPES.map((t) => {
            const on = filters.types.includes(t);
            const gap = missing[t];
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                title={gap?.length ? `แหล่งข้อมูลของ ${gap.map((g) => GAMES[g].name).join(', ')} ยังไม่รองรับประเภทนี้` : undefined}
                onClick={() => onChange({ ...filters, types: toggle(filters.types, t) })}
                className={`chip ${on ? 'border-white/20 bg-white/10 text-fg' : 'border-line text-faint hover:text-muted'} ${t === 'mine' && on ? 'border-mine/50! bg-mine/15! text-mine!' : ''}`}
              >
                <CategoryIcon category={t} size={13} />
                {TYPE_LABEL[t]}
                {gap?.length ? <span className="h-1.5 w-1.5 rounded-full bg-warn/70" aria-label="บางเกมไม่รองรับ" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={group}>
        <h4 className={heading}>ช่วงเวลา</h4>
        <div className={stacked ? 'grid grid-cols-2 gap-2' : 'flex rounded-xl border border-line bg-ink-900/60 p-0.5'} role="radiogroup" aria-label="กรองตามช่วงเวลา">
          {(Object.keys(TIME_FILTER_LABEL) as TimeFilter[]).map((t) => {
            const on = filters.time === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ ...filters, time: t })}
                className={
                  stacked
                    ? `chip h-10 justify-center rounded-xl ${on ? 'border-accent/50 bg-accent/15 text-fg' : 'border-line text-muted'}`
                    : `flex h-7 items-center gap-1 rounded-[10px] px-2.5 text-xs font-medium transition-colors ${on ? 'bg-white/10 text-fg' : 'text-faint hover:text-muted'}`
                }
              >
                {stacked && on && <IconCheck size={13} />}
                {TIME_FILTER_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function countActiveFilters(f: Filters, followed: GameId[]): number {
  let n = 0;
  if (followed.some((g) => !f.games.includes(g))) n++;
  if (f.types.length !== ALL_TYPES.length) n++;
  if (f.time !== 'all') n++;
  return n;
}
