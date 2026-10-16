import { startOfMonth } from 'date-fns';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { GameTile } from '../components/common/Badges';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState, Notice } from '../components/common/EmptyState';
import { SUBSCRIPTION_DAYS } from '../components/my-items/EditorDialog';
import { IconCard, IconEdit, IconInfo, IconPin, IconPlus, IconRefresh, IconTicket, IconTrash } from '../components/icons';
import { usePersonal } from '../data/PersonalContext';
import { useUI } from '../data/UIContext';
import { newId, type BattlePass, type PersonalEvent, type PersonalKind, type Subscription } from '../data/personal';
import { useNow } from '../hooks/useNow';
import { LOCAL_ONLY_NOTICE, PERSONAL_KIND_LABEL } from '../i18n/th';
import { addDaysInput, daysUntil, formatDate, parseLocalDate, toDateInput } from '../lib/dates';
import { gameName } from '../lib/gameMeta';

const TABS: { kind: PersonalKind; icon: ReactNode }[] = [
  { kind: 'subscription', icon: <IconCard size={16} /> },
  { kind: 'battle_pass', icon: <IconTicket size={16} /> },
  { kind: 'personal_event', icon: <IconPin size={16} /> },
];

export default function MyItemsPage() {
  const { store } = usePersonal();
  const { openEditor } = useUI();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.kind === params.get('tab'))?.kind ?? 'subscription') as PersonalKind;
  const counts = {
    subscription: store.subscriptions.length,
    battle_pass: store.battle_passes.length,
    personal_event: store.personal_events.length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ของฉัน</h1>
          <p className="mt-0.5 text-sm text-muted">บัตรรายเดือน แบตเทิลพาส และกำหนดการส่วนตัว แสดงรวมในปฏิทิน</p>
        </div>
        <button type="button" className="btn btn-primary ml-auto" onClick={() => openEditor({ kind: tab })}>
          <IconPlus size={16} /> เพิ่ม{PERSONAL_KIND_LABEL[tab]}
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-ink-900/60 p-1 scrollbar-none" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            role="tab"
            aria-selected={tab === t.kind}
            onClick={() => setParams({ tab: t.kind }, { replace: true })}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.kind ? 'bg-white/10 text-fg' : 'text-muted hover:text-fg'}`}
          >
            {t.icon}
            {PERSONAL_KIND_LABEL[t.kind]}
            <span className="rounded-full bg-white/8 px-1.5 text-[11px] text-muted">{counts[t.kind]}</span>
          </button>
        ))}
      </div>

      {tab === 'subscription' && <Subscriptions items={store.subscriptions} />}
      {tab === 'battle_pass' && <BattlePasses items={store.battle_passes} />}
      {tab === 'personal_event' && <PersonalEvents items={store.personal_events} />}

      <Notice tone="info" icon={<IconInfo size={16} />}>
        {LOCAL_ONLY_NOTICE}{' '}
        <Link to="/settings" className="font-medium text-accent underline-offset-2 hover:underline">
          ส่งออก / นำเข้าข้อมูล
        </Link>
      </Notice>
    </div>
  );
}

function sortByEnd<T>(items: T[], date: (x: T) => string, today: string) {
  // Upcoming and running first (soonest end), then expired (most recent first).
  return [...items].sort((a, b) => {
    const da = date(a);
    const db = date(b);
    const pa = da < today;
    const pb = db < today;
    if (pa !== pb) return pa ? 1 : -1;
    return pa ? db.localeCompare(da) : da.localeCompare(db);
  });
}

function Remaining({ end, start }: { end: string; start?: string }) {
  const now = useNow();
  const left = daysUntil(parseLocalDate(end), now);
  const toStart = start ? daysUntil(parseLocalDate(start), now) : 0;
  if (toStart > 0) return <span className="text-accent">เริ่มในอีก {toStart} วัน</span>;
  if (left < 0) return <span className="text-faint">หมดอายุแล้ว</span>;
  if (left === 0) return <span className="text-danger">หมดวันนี้</span>;
  return <span className={left <= 3 ? 'text-warn' : 'text-ok'}>เหลือ {left} วัน</span>;
}

function Card({ game, title, children, actions, expired }: { game: Subscription['game_id'] | null; title: string; children: ReactNode; actions: ReactNode; expired?: boolean }) {
  return (
    <li className={`panel flex flex-col gap-3 p-4 transition-opacity ${expired ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <GameTile game={game} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{title}</h3>
          <p className="text-xs text-muted">{game ? gameName(game) : 'ไม่ระบุเกม'}</p>
        </div>
      </div>
      <div className="flex-1 text-sm">{children}</div>
      <div className="flex flex-wrap justify-end gap-1 border-t border-line pt-3">{actions}</div>
    </li>
  );
}

function RowActions({ kind, id, title, extra }: { kind: PersonalKind; id: string; title: string; extra?: ReactNode }) {
  const { openEditor, toast } = useUI();
  const { dispatch } = usePersonal();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      {extra}
      <button type="button" className="btn btn-ghost h-8 text-xs" onClick={() => openEditor({ kind, id })}>
        <IconEdit size={14} /> แก้ไข
      </button>
      <button type="button" className="btn btn-ghost h-8 text-xs hover:text-danger" onClick={() => setConfirm(true)}>
        <IconTrash size={14} /> ลบ
      </button>
      <ConfirmDialog
        open={confirm}
        title={`ลบ "${title}"?`}
        confirmLabel="ลบรายการ"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch({ type: 'remove', kind, id });
          toast('ลบรายการแล้ว');
        }}
      >
        รายการนี้จะถูกลบออกจากเบราว์เซอร์และไม่สามารถกู้คืนได้ เว้นแต่คุณส่งออกไฟล์สำรองไว้
      </ConfirmDialog>
    </>
  );
}

function Subscriptions({ items }: { items: Subscription[] }) {
  const { openEditor, toast } = useUI();
  const { dispatch } = usePersonal();
  const now = useNow();
  const today = toDateInput(now);
  const sorted = sortByEnd(items, (s) => s.end_date, today);

  if (!items.length) {
    return (
      <div className="panel">
        <EmptyState
          icon={<IconCard size={26} />}
          title="ยังไม่มีบัตรรายเดือน"
          action={
            <button type="button" className="btn btn-primary" onClick={() => openEditor({ kind: 'subscription' })}>
              <IconPlus size={16} /> เพิ่มรายการแรก
            </button>
          }
        >
          จดวันหมดอายุของบัตรรายเดือน เช่น Welkin Moon หรือ Express Supply Pass แล้วระบบจะนับวันที่เหลือและปักหมุดวันหมดอายุในปฏิทิน
        </EmptyState>
      </div>
    );
  }

  const renew = (s: Subscription) => {
    const start = addDaysInput(s.end_date, 1);
    dispatch({
      type: 'upsert',
      kind: 'subscription',
      item: { ...s, id: newId(), start_date: start, end_date: addDaysInput(start, SUBSCRIPTION_DAYS - 1) },
    });
    toast(`เพิ่มบัตรต่อถึง ${formatDate(parseLocalDate(addDaysInput(start, SUBSCRIPTION_DAYS - 1)))}`);
  };
  // Only the latest card of each game/name pair offers "+1 เดือน".
  const newest = new Map<string, Subscription>();
  for (const s of items) {
    const k = `${s.game_id}|${s.name}`;
    const cur = newest.get(k);
    if (!cur || s.end_date > cur.end_date) newest.set(k, s);
  }
  const latest = new Set([...newest.values()].map((s) => s.id));

  return (
    <>
      <SpendingSummary items={items} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((s) => (
          <Card
            key={s.id}
            game={s.game_id}
            title={s.name}
            expired={s.end_date < today}
            actions={
              <RowActions
                kind="subscription"
                id={s.id}
                title={s.name}
                extra={
                  latest.has(s.id) && (
                    <button type="button" className="btn btn-ghost h-8 text-xs text-accent" onClick={() => renew(s)} title="สร้างรายการต่อจากวันหมดอายุเดิม">
                      <IconRefresh size={14} /> +1 เดือน
                    </button>
                  )
                }
              />
            }
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-semibold">
                <Remaining end={s.end_date} start={s.start_date} />
              </span>
              {s.price !== undefined && (
                <span className="text-xs text-muted">
                  {s.price.toLocaleString('th-TH')} {s.currency}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              {formatDate(parseLocalDate(s.start_date))} – {formatDate(parseLocalDate(s.end_date))} · {s.renewal === 'auto' ? 'ต่ออายุอัตโนมัติ' : 'ซื้อใหม่เอง'}
            </p>
            {s.note && <p className="mt-2 line-clamp-2 text-xs text-fg/70">{s.note}</p>}
          </Card>
        ))}
      </ul>
    </>
  );
}

/** Totals by currency from what the user typed only (FR-06). */
function SpendingSummary({ items }: { items: Subscription[] }) {
  const now = useNow();
  const summary = useMemo(() => {
    const monthStart = toDateInput(startOfMonth(now));
    const nextMonthStart = toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const yearStart = `${now.getFullYear()}-01-01`;
    const rows = new Map<string, { month: number; year: number; total: number }>();
    for (const s of items) {
      if (s.price === undefined) continue;
      const cur = s.currency ?? '—';
      const r = rows.get(cur) ?? { month: 0, year: 0, total: 0 };
      r.total += s.price;
      if (s.start_date >= yearStart) r.year += s.price;
      if (s.start_date >= monthStart && s.start_date < nextMonthStart) r.month += s.price;
      rows.set(cur, r);
    }
    return [...rows.entries()];
  }, [items, now]);

  if (!summary.length) return null;
  const fmt = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  return (
    <section className="panel grid gap-3 p-4 sm:grid-cols-3">
      {(['month', 'year', 'total'] as const).map((k) => (
        <div key={k}>
          <p className="text-xs text-muted">{k === 'month' ? 'ใช้จ่ายเดือนนี้' : k === 'year' ? 'ใช้จ่ายปีนี้' : 'รวมทั้งหมดที่จด'}</p>
          {summary.map(([cur, r]) => (
            <p key={cur} className="text-lg font-semibold tabular-nums">
              {fmt(r[k])} <span className="text-xs font-normal text-muted">{cur}</span>
            </p>
          ))}
        </div>
      ))}
      <p className="text-[11px] text-faint sm:col-span-3">คำนวณจากราคาที่คุณกรอกเท่านั้น นับตามวันเริ่มของแต่ละบัตร</p>
    </section>
  );
}

function BattlePasses({ items }: { items: BattlePass[] }) {
  const { openEditor } = useUI();
  const now = useNow();
  const today = toDateInput(now);
  if (!items.length) {
    return (
      <div className="panel">
        <EmptyState
          icon={<IconTicket size={26} />}
          title="ยังไม่มีแบตเทิลพาส"
          action={
            <button type="button" className="btn btn-primary" onClick={() => openEditor({ kind: 'battle_pass' })}>
              <IconPlus size={16} /> เพิ่มรายการแรก
            </button>
          }
        >
          บันทึกซีซันแบตเทิลพาส วันสิ้นสุด และระดับปัจจุบัน เพื่อไม่ให้พลาดรางวัลก่อนหมดเวลา
        </EmptyState>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sortByEnd(items, (b) => b.end_date, today).map((b) => {
        const pct = b.level !== undefined && b.max_level ? Math.min(100, Math.round((b.level / b.max_level) * 100)) : null;
        return (
          <Card key={b.id} game={b.game_id} title={b.name} expired={b.end_date < today} actions={<RowActions kind="battle_pass" id={b.id} title={b.name} />}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-semibold">
                <Remaining end={b.end_date} start={b.start_date} />
              </span>
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${b.purchased ? 'bg-ok/12 text-ok' : 'bg-white/8 text-muted'}`}>
                {b.purchased ? 'ซื้อแล้ว' : 'ยังไม่ซื้อ'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {formatDate(parseLocalDate(b.start_date))} – {formatDate(parseLocalDate(b.end_date))}
            </p>
            {b.level !== undefined && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted">ระดับ</span>
                  <span className="tabular-nums">
                    {b.level}
                    {b.max_level ? ` / ${b.max_level}` : ''}
                  </span>
                </div>
                {pct !== null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-gradient-to-r from-accent-strong to-mine" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )}
            {b.note && <p className="mt-2 line-clamp-2 text-xs text-fg/70">{b.note}</p>}
          </Card>
        );
      })}
    </ul>
  );
}

function PersonalEvents({ items }: { items: PersonalEvent[] }) {
  const { openEditor } = useUI();
  const now = useNow();
  const today = toDateInput(now);
  if (!items.length) {
    return (
      <div className="panel">
        <EmptyState
          icon={<IconPin size={26} />}
          title="ยังไม่มีรายการส่วนตัว"
          action={
            <button type="button" className="btn btn-primary" onClick={() => openEditor({ kind: 'personal_event' })}>
              <IconPlus size={16} /> เพิ่มรายการแรก
            </button>
          }
        >
          เช่น วันเตรียมทรัพยากรก่อนแพตช์ หรือเป้าหมายส่วนตัวที่อยากทำให้ทันก่อนตู้หมด
        </EmptyState>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sortByEnd(items, (p) => p.date, today).map((p) => (
        <Card key={p.id} game={p.game_id ?? null} title={p.title} expired={p.date < today} actions={<RowActions kind="personal_event" id={p.id} title={p.title} />}>
          <div className="text-lg font-semibold">
            <Remaining end={p.date} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatDate(parseLocalDate(p.date))}
            {p.time ? ` เวลา ${p.time} น.` : ' (ทั้งวัน)'}
          </p>
          {p.note && <p className="mt-2 line-clamp-2 text-xs text-fg/70">{p.note}</p>}
        </Card>
      ))}
    </ul>
  );
}
