import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { GAME_IDS, type GameId } from '../../../shared/schema';
import { PERSONAL_KIND_LABEL } from '../../i18n/th';
import { usePersonal } from '../../data/PersonalContext';
import { useUI, type EditorTarget } from '../../data/UIContext';
import {
  BattlePassSchema,
  PersonalEventSchema,
  SubscriptionSchema,
  newId,
  type BattlePass,
  type PersonalEvent,
  type Subscription,
} from '../../data/personal';
import { addDaysInput, todayInput } from '../../lib/dates';
import { GAMES } from '../../lib/gameMeta';
import { Sheet } from '../common/Sheet';

/** Monthly cards in all four games last 30 days. */
export const SUBSCRIPTION_DAYS = 30;

type Draft = Record<string, string | boolean>;

export function EditorDialog() {
  const { editor, closeEditor } = useUI();
  return (
    <Sheet
      open={!!editor}
      onClose={closeEditor}
      title={
        editor && (
          <h2 className="text-lg font-semibold">
            {editor.id ? 'แก้ไข' : 'เพิ่ม'}
            {PERSONAL_KIND_LABEL[editor.kind]}
          </h2>
        )
      }
    >
      {editor && <EditorForm key={`${editor.kind}:${editor.id ?? 'new'}`} target={editor} />}
    </Sheet>
  );
}

function initialDraft(target: EditorTarget, items: { s?: Subscription; b?: BattlePass; p?: PersonalEvent }, followed: GameId[]): Draft {
  const game = followed[0] ?? 'genshin';
  const start = target.date ?? todayInput();
  if (target.kind === 'subscription') {
    const s = items.s;
    return {
      game_id: s?.game_id ?? game,
      name: s?.name ?? '',
      price: s?.price !== undefined ? String(s.price) : '',
      currency: s?.currency ?? 'THB',
      start_date: s?.start_date ?? start,
      end_date: s?.end_date ?? addDaysInput(start, SUBSCRIPTION_DAYS - 1),
      renewal: s?.renewal ?? 'manual',
      note: s?.note ?? '',
    };
  }
  if (target.kind === 'battle_pass') {
    const b = items.b;
    return {
      game_id: b?.game_id ?? game,
      name: b?.name ?? '',
      start_date: b?.start_date ?? start,
      end_date: b?.end_date ?? addDaysInput(start, 41),
      purchased: b?.purchased ?? true,
      level: b?.level !== undefined ? String(b.level) : '',
      max_level: b?.max_level !== undefined ? String(b.max_level) : '',
      note: b?.note ?? '',
    };
  }
  const p = items.p;
  return {
    game_id: p?.game_id ?? '',
    title: p?.title ?? '',
    date: p?.date ?? start,
    time: p?.time ?? '',
    note: p?.note ?? '',
  };
}

const optText = (v: string | boolean) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const optNum = (v: string | boolean) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : undefined);

function EditorForm({ target }: { target: EditorTarget }) {
  const { store, dispatch } = usePersonal();
  const { closeEditor, toast } = useUI();
  const existing = {
    s: store.subscriptions.find((x) => x.id === target.id),
    b: store.battle_passes.find((x) => x.id === target.id),
    p: store.personal_events.find((x) => x.id === target.id),
  };
  const [draft, setDraft] = useState<Draft>(() => initialDraft(target, existing, store.settings.followed_games));
  const [error, setError] = useState<string | null>(null);
  const [endTouched, setEndTouched] = useState(!!target.id);
  const set = (k: string) => (v: string | boolean) => setDraft((d) => ({ ...d, [k]: v }));

  // A new monthly card ends 30 days after it starts unless the user picked an end date.
  useEffect(() => {
    if (target.kind === 'subscription' && !endTouched && typeof draft.start_date === 'string' && draft.start_date) {
      setDraft((d) => ({ ...d, end_date: addDaysInput(d.start_date as string, SUBSCRIPTION_DAYS - 1) }));
    }
  }, [draft.start_date, endTouched, target.kind]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const id = target.id ?? newId();
    const d = draft;
    let parsed;
    if (target.kind === 'subscription') {
      parsed = SubscriptionSchema.safeParse({
        id,
        game_id: d.game_id,
        name: d.name,
        price: optNum(d.price),
        currency: optNum(d.price) !== undefined ? optText(d.currency) : undefined,
        start_date: d.start_date,
        end_date: d.end_date,
        renewal: d.renewal,
        note: optText(d.note),
      });
    } else if (target.kind === 'battle_pass') {
      parsed = BattlePassSchema.safeParse({
        id,
        game_id: d.game_id,
        name: d.name,
        start_date: d.start_date,
        end_date: d.end_date,
        purchased: d.purchased,
        level: optNum(d.level),
        max_level: optNum(d.max_level),
        note: optText(d.note),
      });
    } else {
      parsed = PersonalEventSchema.safeParse({
        id,
        title: d.title,
        game_id: optText(d.game_id),
        date: d.date,
        time: optText(d.time),
        note: optText(d.note),
      });
    }
    if (!parsed.success) {
      setError(messageFor(parsed.error.issues[0]?.path[0]));
      return;
    }
    const item = parsed.data as Subscription & BattlePass & PersonalEvent;
    if ('end_date' in item && 'start_date' in item && item.end_date < item.start_date) {
      setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
      return;
    }
    if (target.kind === 'battle_pass' && item.max_level !== undefined && item.level !== undefined && item.level > item.max_level) {
      setError('ระดับปัจจุบันต้องไม่เกินระดับสูงสุด');
      return;
    }
    dispatch({ type: 'upsert', kind: target.kind, item });
    toast(target.id ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มรายการแล้ว');
    closeEditor();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {target.kind === 'personal_event' ? (
        <>
          <Field label="ชื่อรายการ">
            <input className="field" value={draft.title as string} onChange={(e) => set('title')(e.target.value)} placeholder="เช่น เก็บ Primogem ให้ครบก่อนตู้ใหม่" autoFocus maxLength={120} />
          </Field>
          <Field label="เกม" optional>
            <GameSelect value={draft.game_id as string} onChange={set('game_id')} allowNone />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="วันที่">
              <input type="date" className="field" value={draft.date as string} onChange={(e) => set('date')(e.target.value)} />
            </Field>
            <Field label="เวลา" optional>
              <input type="time" className="field" value={draft.time as string} onChange={(e) => set('time')(e.target.value)} />
            </Field>
          </div>
        </>
      ) : (
        <>
          <Field label="เกม">
            <GameSelect value={draft.game_id as string} onChange={set('game_id')} />
          </Field>
          <Field label={target.kind === 'subscription' ? 'ชื่อแพ็กเกจ' : 'ชื่อซีซัน / แพ็ก'}>
            <input
              className="field"
              value={draft.name as string}
              onChange={(e) => set('name')(e.target.value)}
              placeholder={target.kind === 'subscription' ? 'เช่น Blessing of the Welkin Moon' : 'เช่น Gnostic Hymn 7.1'}
              autoFocus={!target.id}
              maxLength={80}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="วันเริ่ม">
              <input type="date" className="field" value={draft.start_date as string} onChange={(e) => set('start_date')(e.target.value)} />
            </Field>
            <Field label={target.kind === 'subscription' ? 'วันหมดอายุ' : 'วันสิ้นสุด'}>
              <input
                type="date"
                className="field"
                value={draft.end_date as string}
                min={draft.start_date as string}
                onChange={(e) => {
                  setEndTouched(true);
                  set('end_date')(e.target.value);
                }}
              />
            </Field>
          </div>
          {target.kind === 'subscription' ? (
            <>
              <div className="grid grid-cols-[1fr_7rem] gap-3">
                <Field label="ราคาที่จ่าย" optional>
                  <input type="number" inputMode="decimal" min={0} step="0.01" className="field" value={draft.price as string} onChange={(e) => set('price')(e.target.value)} placeholder="เช่น 179" />
                </Field>
                <Field label="สกุลเงิน">
                  <input className="field uppercase" value={draft.currency as string} onChange={(e) => set('currency')(e.target.value.toUpperCase())} maxLength={8} list="currencies" />
                  <datalist id="currencies">
                    <option value="THB" />
                    <option value="USD" />
                    <option value="SGD" />
                    <option value="JPY" />
                  </datalist>
                </Field>
              </div>
              <Field label="การต่ออายุ">
                <Segmented
                  value={draft.renewal as string}
                  onChange={set('renewal')}
                  options={[
                    ['manual', 'ซื้อใหม่เอง'],
                    ['auto', 'ต่ออายุอัตโนมัติ'],
                  ]}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="สถานะการซื้อ">
                <Segmented
                  value={draft.purchased ? 'yes' : 'no'}
                  onChange={(v) => set('purchased')(v === 'yes')}
                  options={[
                    ['yes', 'ซื้อแล้ว'],
                    ['no', 'ยังไม่ซื้อ'],
                  ]}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ระดับปัจจุบัน" optional>
                  <input type="number" inputMode="numeric" min={0} className="field" value={draft.level as string} onChange={(e) => set('level')(e.target.value)} />
                </Field>
                <Field label="ระดับสูงสุด" optional>
                  <input type="number" inputMode="numeric" min={1} className="field" value={draft.max_level as string} onChange={(e) => set('max_level')(e.target.value)} placeholder="เช่น 50" />
                </Field>
              </div>
            </>
          )}
        </>
      )}
      <Field label={target.kind === 'battle_pass' ? 'หมายเหตุ / รางวัลที่อยากได้' : 'หมายเหตุ'} optional>
        <textarea className="field h-auto min-h-20 py-2" rows={3} value={draft.note as string} onChange={(e) => set('note')(e.target.value)} maxLength={1000} />
      </Field>

      {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={closeEditor}>
          ยกเลิก
        </button>
        <button type="submit" className="btn btn-primary min-w-24">
          บันทึก
        </button>
      </div>
    </form>
  );
}

function messageFor(field: PropertyKey | undefined): string {
  switch (field) {
    case 'name':
    case 'title':
      return 'กรุณากรอกชื่อรายการ';
    case 'start_date':
    case 'end_date':
    case 'date':
      return 'กรุณาเลือกวันที่ให้ครบ';
    case 'price':
      return 'ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป';
    case 'level':
    case 'max_level':
      return 'ระดับต้องเป็นจำนวนเต็มบวก';
    case 'currency':
      return 'กรุณาระบุสกุลเงิน';
    default:
      return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
  }
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-faint">(ไม่บังคับ)</span>}
      </span>
      {children}
    </label>
  );
}

function GameSelect({ value, onChange, allowNone }: { value: string; onChange: (v: string) => void; allowNone?: boolean }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {allowNone && <option value="">ไม่ระบุเกม</option>}
      {GAME_IDS.map((g) => (
        <option key={g} value={g}>
          {GAMES[g].name}
        </option>
      ))}
    </select>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="grid grid-flow-col gap-1 rounded-xl border border-line bg-ink-900 p-1" role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-8 rounded-lg text-sm font-medium transition-colors ${value === v ? 'bg-white/10 text-fg' : 'text-muted hover:text-fg'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
