import { useState, type CSSProperties, type ReactNode } from 'react';
import { REGION_LABEL, STATUS_HINT, SUBTYPE_LABEL } from '../../i18n/th';
import { usePersonal } from '../../data/PersonalContext';
import { useUI } from '../../data/UIContext';
import { formatDate, formatDateTime, offsetLabel, parseLocalDate, phaseOf, relativeLabel } from '../../lib/dates';
import { GAMES, gameColor, gameName } from '../../lib/gameMeta';
import type { CalendarItem } from '../../lib/items';
import { useNow } from '../../hooks/useNow';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { GameTile, ManualBadge, StatusBadge, TypeBadge } from '../common/Badges';
import { Sheet } from '../common/Sheet';
import { IconClock, IconEdit, IconExternal, IconTrash } from '../icons';

export function DetailPanel() {
  const { selected, select } = useUI();
  return (
    <Sheet
      open={!!selected}
      onClose={() => select(null)}
      variant="side"
      title={selected ? <DetailTitle item={selected} /> : null}
      footer={selected ? <DetailFooter item={selected} /> : undefined}
    >
      {selected && <DetailBody item={selected} />}
    </Sheet>
  );
}

function DetailTitle({ item }: { item: CalendarItem }) {
  const subLabel = item.personal?.label ?? (item.event?.subtype ? SUBTYPE_LABEL[item.event.subtype] : undefined);
  return (
    <div className="flex items-start gap-3">
      <GameTile game={item.game_id} size="lg" />
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <TypeBadge category={item.category} label={subLabel} />
          <StatusBadge status={item.status} />
          {item.manual && <ManualBadge />}
        </div>
        <h2 className="text-lg leading-snug font-semibold text-balance">{item.title}</h2>
        <p className="mt-0.5 text-xs text-muted">{gameName(item.game_id)}</p>
      </div>
    </div>
  );
}

function DetailBody({ item }: { item: CalendarItem }) {
  const now = useNow(30_000);
  const e = item.event;
  const phase = phaseOf(item.start, item.end, now);
  const [imgOk, setImgOk] = useState(true);
  const tz = e?.timezone;
  const showServer = tz && item.start && offsetLabel(item.start, tz) !== offsetLabel(item.start);

  return (
    <div className="space-y-5" style={{ '--g': gameColor(item.game_id) } as CSSProperties}>
      {e?.image_url && imgOk && (
        <img
          src={e.image_url}
          alt=""
          loading="lazy"
          onError={() => setImgOk(false)}
          className="aspect-[16/7] w-full rounded-2xl border border-line object-cover"
        />
      )}

      <div className="rounded-2xl border border-line bg-ink-900/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <IconClock size={15} className="text-muted" />
          <span
            className={`text-sm font-semibold ${phase === 'active' ? 'text-ok' : phase === 'upcoming' ? 'text-accent' : 'text-muted'}`}
          >
            {relativeLabel(item.start, item.end, now)}
          </span>
        </div>
        <dl className="grid grid-cols-[4.5rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted">เริ่ม</dt>
          <dd>{item.start ? whenText(item.start, item.all_day) : <Missing />}</dd>
          <dt className="text-muted">สิ้นสุด</dt>
          <dd>{item.end ? whenText(item.end, item.all_day) : <Missing text="ยังไม่ประกาศวันสิ้นสุด" />}</dd>
        </dl>
        {(item.start || item.end) && (
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">
            แสดงตามเวลาเครื่องของคุณ ({offsetLabel(item.start ?? item.end!)})
            {e && (
              <>
                {' '}
                · เซิร์ฟ {REGION_LABEL[e.region] ?? e.region}
                {showServer && (
                  <>
                    <br />
                    เวลาเซิร์ฟเวอร์ ({offsetLabel(item.start!, tz)}):{' '}
                    {item.start && formatDateTime(item.start, tz)}
                    {item.end && ` – ${formatDateTime(item.end, tz)}`}
                  </>
                )}
              </>
            )}
          </p>
        )}
      </div>

      {item.status !== 'confirmed' && (
        <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-muted">
          <b className="font-semibold text-fg/80">สถานะข้อมูล:</b> {STATUS_HINT[item.status]}
        </p>
      )}

      {e?.featured && e.featured.length > 0 && (
        <Section title={item.category === 'banner' ? 'ตัวละคร / อาวุธในตู้' : 'รายการที่เกี่ยวข้อง'}>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {e.featured.map((f) => (
              <li key={f.name} className="text-center">
                <FeaturedIcon name={f.name} src={f.image_url} rarity={f.rarity} />
                <span className="mt-1 block truncate text-[10px] text-muted" title={f.name}>
                  {f.name}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {e?.description && (
        <Section title="รายละเอียด">
          <p className="text-sm leading-relaxed whitespace-pre-line text-fg/85">{e.description}</p>
        </Section>
      )}

      {e?.version && (
        <Section title="เวอร์ชัน">
          <p className="text-sm">{e.version}</p>
        </Section>
      )}

      {item.personal && <PersonalDetails item={item} />}

      {e && (
        <Section title="แหล่งที่มา">
          <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 text-xs">
            <dt className="text-muted">แหล่งข้อมูล</dt>
            <dd>{e.source_name}</dd>
            <dt className="text-muted">ข้อมูลเปลี่ยนล่าสุด</dt>
            <dd>{formatDateTime(new Date(e.last_synced_at))}</dd>
            <dt className="text-muted">พบครั้งแรก</dt>
            <dd>{formatDateTime(new Date(e.first_seen_at))}</dd>
          </dl>
        </Section>
      )}
    </div>
  );
}

function whenText(d: Date, allDay: boolean) {
  return allDay ? `${formatDate(d)} (ทั้งวัน)` : formatDateTime(d);
}

function Missing({ text = 'ยังตรวจสอบไม่ได้' }: { text?: string }) {
  return <span className="text-warn/90">{text}</span>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

const RARITY_RING: Record<number, string> = { 5: '#f5b942', 4: '#b18cff', 3: '#5fa8ff' };

function FeaturedIcon({ name, src, rarity }: { name: string; src?: string; rarity?: number }) {
  const [ok, setOk] = useState(!!src);
  const ring = rarity ? RARITY_RING[rarity] : undefined;
  return (
    <div
      className="relative mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-ink-700"
      style={{
        boxShadow: ring ? `inset 0 0 0 1.5px ${ring}aa` : undefined,
        background: ring ? `linear-gradient(160deg, ${ring}33, var(--color-ink-800))` : undefined,
      }}
    >
      {ok && src ? (
        <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover" onError={() => setOk(false)} />
      ) : (
        <span className="text-sm font-semibold text-muted">{name.slice(0, 2)}</span>
      )}
      {rarity && <span className="absolute right-1 bottom-0.5 text-[9px] font-bold" style={{ color: ring }}>{rarity}★</span>}
    </div>
  );
}

function PersonalDetails({ item }: { item: CalendarItem }) {
  const { store } = usePersonal();
  const ref = item.personal!;
  const rows: [string, ReactNode][] = [];
  if (ref.kind === 'subscription') {
    const s = store.subscriptions.find((x) => x.id === ref.id);
    if (!s) return null;
    rows.push(['แพ็กเกจ', s.name], ['ช่วงเวลา', `${formatDate(parseLocalDate(s.start_date))} – ${formatDate(parseLocalDate(s.end_date))}`]);
    rows.push(['การต่ออายุ', s.renewal === 'auto' ? 'ต่ออายุอัตโนมัติ' : 'ซื้อใหม่เอง']);
    if (s.price !== undefined) rows.push(['ราคา', `${s.price.toLocaleString('th-TH')} ${s.currency ?? ''}`]);
    if (s.note) rows.push(['หมายเหตุ', s.note]);
  } else if (ref.kind === 'battle_pass') {
    const b = store.battle_passes.find((x) => x.id === ref.id);
    if (!b) return null;
    rows.push(['สถานะ', b.purchased ? 'ซื้อแล้ว' : 'ยังไม่ซื้อ']);
    if (b.level !== undefined) rows.push(['ระดับ', b.max_level ? `${b.level} / ${b.max_level}` : String(b.level)]);
    if (b.note) rows.push(['หมายเหตุ', b.note]);
  } else {
    const p = store.personal_events.find((x) => x.id === ref.id);
    if (!p) return null;
    if (p.note) rows.push(['หมายเหตุ', p.note]);
  }
  return (
    <Section title={ref.label}>
      {rows.length ? (
        <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="whitespace-pre-line">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted">ไม่มีรายละเอียดเพิ่มเติม</p>
      )}
      <p className="mt-3 text-[11px] text-faint">เก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น</p>
    </Section>
  );
}

function DetailFooter({ item }: { item: CalendarItem }) {
  const { openEditor, select, toast } = useUI();
  const { dispatch } = usePersonal();
  const [confirm, setConfirm] = useState(false);

  if (item.personal) {
    const ref = item.personal;
    return (
      <>
        <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
          <IconTrash size={15} /> ลบ
        </button>
        <button type="button" className="btn btn-primary" onClick={() => openEditor({ kind: ref.kind, id: ref.id })}>
          <IconEdit size={15} /> แก้ไข
        </button>
        <ConfirmDialog
          open={confirm}
          title={`ลบ "${item.title}"?`}
          confirmLabel="ลบรายการ"
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            dispatch({ type: 'remove', kind: ref.kind, id: ref.id });
            select(null);
            toast('ลบรายการแล้ว');
          }}
        >
          รายการนี้จะถูกลบออกจากเบราว์เซอร์และไม่สามารถกู้คืนได้ เว้นแต่คุณส่งออกไฟล์สำรองไว้
        </ConfirmDialog>
      </>
    );
  }

  const url = item.event?.source_url ?? (item.game_id ? GAMES[item.game_id].news_url : undefined);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full sm:w-auto">
      เปิดประกาศต้นทาง <IconExternal size={15} />
    </a>
  );
}
