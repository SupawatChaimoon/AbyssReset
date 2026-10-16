import { useRef, useState, type ReactNode } from 'react';
import type { GameId } from '../../shared/schema';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Notice } from '../components/common/EmptyState';
import { Sheet } from '../components/common/Sheet';
import { IconCheck, IconDownload, IconInfo, IconTrash, IconUpload } from '../components/icons';
import { usePersonal } from '../data/PersonalContext';
import { useUI } from '../data/UIContext';
import { exportStore, importStore, parseStore, type PersonalStore, type Settings } from '../data/personal';
import { LOCAL_ONLY_NOTICE, REGION_LABEL } from '../i18n/th';
import { toDateInput } from '../lib/dates';
import { GAMES, GAME_IDS, GAME_STYLE } from '../lib/gameMeta';

export default function SettingsPage() {
  const { store, dispatch, problem } = usePersonal();
  const { toast } = useUI();
  const { followed_games: followed, hidden_games: hidden, default_view } = store.settings;
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PersonalStore | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const setFollowed = (g: GameId) => {
    const next = followed.includes(g) ? followed.filter((x) => x !== g) : GAME_IDS.filter((x) => x === g || followed.includes(x));
    dispatch({ type: 'settings', patch: { followed_games: next, hidden_games: hidden.filter((h) => next.includes(h)) } });
  };
  const setHidden = (g: GameId) =>
    dispatch({ type: 'settings', patch: { hidden_games: hidden.includes(g) ? hidden.filter((x) => x !== g) : [...hidden, g] } });

  const doExport = () => {
    const blob = new Blob([exportStore(store)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abyssreset-backup-${toDateInput(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('ส่งออกไฟล์สำรองแล้ว');
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('ไฟล์ใหญ่เกินไป');
      setPending(parseStore(JSON.parse(await file.text())));
    } catch (err) {
      toast(err instanceof SyntaxError ? 'ไฟล์นี้ไม่ใช่ JSON' : err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ', 'warn');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!pending) return;
    dispatch({ type: 'replace', store: importStore(store, pending, mode) });
    setPending(null);
    toast(mode === 'merge' ? 'นำเข้าและรวมข้อมูลแล้ว' : 'นำเข้าและแทนที่ข้อมูลแล้ว');
  };

  const total = store.subscriptions.length + store.battle_passes.length + store.personal_events.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ตั้งค่า</h1>
        <p className="mt-0.5 text-sm text-muted">ทุกอย่างในหน้านี้เก็บไว้ในเบราว์เซอร์ของคุณ ไม่ต้องสมัครบัญชี</p>
      </div>

      {problem && <Notice tone="danger">{problem}</Notice>}

      <Section title="เกมที่ติดตาม" desc="เลือกเกมที่เล่น และซ่อนชั่วคราวได้โดยไม่ต้องเลิกติดตาม">
        <ul className="grid gap-2 sm:grid-cols-2">
          {GAME_IDS.map((g) => {
            const on = followed.includes(g);
            const isHidden = hidden.includes(g);
            return (
              <li key={g} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${on ? 'border-white/15 bg-white/[0.04]' : 'border-line'}`}>
                <span className="h-3 w-3 rounded-full" style={{ background: on ? GAME_STYLE[g].color : 'var(--color-faint)' }} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${on ? '' : 'text-muted'}`}>{GAMES[g].name}</p>
                  <p className="text-[11px] text-faint">เซิร์ฟ {REGION_LABEL[GAMES[g].region]}</p>
                </div>
                {on && (
                  <button type="button" className={`btn h-7 px-2 text-[11px] ${isHidden ? 'btn-soft' : 'btn-ghost'}`} onClick={() => setHidden(g)}>
                    {isHidden ? 'ซ่อนอยู่' : 'แสดง'}
                  </button>
                )}
                <Toggle on={on} onChange={() => setFollowed(g)} label={`ติดตาม ${GAMES[g].name}`} />
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-faint">ตอนนี้รองรับเซิร์ฟ Asia สำหรับเกม HoYoverse และ SEA สำหรับ Wuthering Waves</p>
      </Section>

      <Section title="มุมมองเริ่มต้น" desc="อัตโนมัติ = รายเดือนบนจอกว้าง และรายการบนมือถือ">
        <div className="grid max-w-md grid-cols-3 gap-1 rounded-xl border border-line bg-ink-900 p-1" role="radiogroup">
          {(
            [
              ['auto', 'อัตโนมัติ'],
              ['month', 'รายเดือน'],
              ['agenda', 'รายการ'],
            ] as [Settings['default_view'], string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={default_view === v}
              onClick={() => dispatch({ type: 'settings', patch: { default_view: v } })}
              className={`h-9 rounded-lg text-sm font-medium transition-colors ${default_view === v ? 'bg-white/10 text-fg' : 'text-muted hover:text-fg'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="ข้อมูลของคุณ" desc={`บัตรรายเดือน แบตเทิลพาส และรายการส่วนตัว รวม ${total} รายการ`}>
        <Notice tone="info" icon={<IconInfo size={16} />}>
          {LOCAL_ONLY_NOTICE}
        </Notice>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-soft" onClick={doExport}>
            <IconDownload size={15} /> ส่งออก JSON
          </button>
          <button type="button" className="btn btn-soft" onClick={() => fileInput.current?.click()}>
            <IconUpload size={15} /> นำเข้า JSON
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" className="btn btn-danger sm:ml-auto" onClick={() => setConfirmClear(true)} disabled={!total}>
            <IconTrash size={15} /> ล้างข้อมูลทั้งหมด
          </button>
        </div>
      </Section>

      <Sheet
        open={!!pending}
        onClose={() => setPending(null)}
        width="md:max-w-md"
        title={<h2 className="text-lg font-semibold">นำเข้าข้อมูล</h2>}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
              ยกเลิก
            </button>
            <button type="button" className="btn btn-soft" onClick={() => applyImport('replace')}>
              แทนที่ทั้งหมด
            </button>
            <button type="button" className="btn btn-primary" onClick={() => applyImport('merge')}>
              <IconCheck size={15} /> รวมกับข้อมูลเดิม
            </button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3 text-sm text-muted">
            <p>ไฟล์ถูกต้อง มีข้อมูลดังนี้</p>
            <ul className="space-y-1 rounded-xl bg-white/[0.04] p-3 text-fg">
              <li>บัตรรายเดือน {pending.subscriptions.length} รายการ</li>
              <li>แบตเทิลพาส {pending.battle_passes.length} รายการ</li>
              <li>รายการส่วนตัว {pending.personal_events.length} รายการ</li>
            </ul>
            <p>
              <b className="text-fg">รวมกับข้อมูลเดิม</b> จะเพิ่มรายการใหม่และอัปเดตรายการที่มีอยู่แล้ว ตั้งค่าเดิมไม่เปลี่ยน
              <br />
              <b className="text-fg">แทนที่ทั้งหมด</b> จะลบข้อมูลปัจจุบันและใช้ข้อมูลกับตั้งค่าจากไฟล์แทน
            </p>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmClear}
        title="ล้างข้อมูลส่วนตัวทั้งหมด?"
        confirmLabel="ล้างข้อมูล"
        requireWord="ลบ"
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          dispatch({ type: 'clear' });
          toast('ล้างข้อมูลส่วนตัวแล้ว');
        }}
      >
        บัตรรายเดือน แบตเทิลพาส และรายการส่วนตัวทั้ง {total} รายการจะถูกลบจากเบราว์เซอร์นี้ การตั้งค่าเกมยังอยู่ แนะนำให้ส่งออกไฟล์สำรองก่อน
      </ConfirmDialog>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className="mt-0.5 mb-4 text-xs text-muted">{desc}</p>}
      {children}
    </section>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-accent-strong' : 'bg-white/12'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  );
}
