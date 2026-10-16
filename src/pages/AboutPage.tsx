import type { CSSProperties, ReactNode } from 'react';
import { EVENT_TYPES } from '../../shared/schema';
import { usePublic } from '../data/PublicDataContext';
import { REGION_LABEL, STATUS_HINT, STATUS_LABEL, TYPE_LABEL } from '../i18n/th';
import { formatDateTime } from '../lib/dates';
import { GAMES, GAME_IDS, GAME_STYLE, SUPPORTED_TYPES } from '../lib/gameMeta';
import { IconCheck, IconX } from '../components/icons';

const SOURCE_INFO: Record<string, { name: string; url: string }> = {
  ennead: { name: 'Ennead API (ชุมชน)', url: 'https://api.ennead.cc' },
  kuro: { name: 'ประกาศในเกมของ Kuro Games', url: 'https://wutheringwaves.kurogames.com' },
  manual: { name: 'ผู้ดูแลกรอกเองจากประกาศทางการ', url: '' },
};

export default function AboutPage() {
  const { status, events } = usePublic();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">แหล่งข้อมูลและข้อจำกัด</h1>
        <p className="mt-0.5 text-sm text-muted">AbyssReset ดึงข้อมูลอัตโนมัติทุก 6 ชั่วโมง และไม่เดาวันที่ที่แหล่งข้อมูลไม่มี</p>
      </div>

      <Section title="สถานะการดึงข้อมูล">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-2 py-2 font-medium">แหล่ง</th>
                <th className="px-2 py-2 font-medium">สถานะ</th>
                <th className="px-2 py-2 font-medium">ดึงสำเร็จล่าสุด</th>
                <th className="px-2 py-2 text-right font-medium">รายการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(status?.sources ?? []).map((s) => {
                const info = SOURCE_INFO[s.source_id.split(':')[0]];
                return (
                  <tr key={s.source_id}>
                    <td className="px-2 py-2.5">
                      <p className="font-medium">{s.game_id ? GAMES[s.game_id].name : 'กรอกโดยผู้ดูแล'}</p>
                      <p className="text-[11px] text-faint">{info?.name ?? s.source_id}</p>
                    </td>
                    <td className="px-2 py-2.5">
                      {s.ok ? (
                        <span className="inline-flex items-center gap-1 text-xs text-ok">
                          <IconCheck size={13} /> ปกติ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-warn" title={s.error}>
                          <IconX size={13} /> ล้มเหลว
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-muted">{s.last_success_at ? formatDateTime(new Date(s.last_success_at)) : '—'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{s.item_count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!status && <p className="text-sm text-muted">ยังโหลดสถานะไม่ได้</p>}
      </Section>

      <Section title="ข้อมูลที่แต่ละเกมรองรับ">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-center text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-2 py-2 text-left font-medium">เกม</th>
                {EVENT_TYPES.map((t) => (
                  <th key={t} className="px-2 py-2 font-medium">
                    {TYPE_LABEL[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {GAME_IDS.map((g) => (
                <tr key={g}>
                  <td className="px-2 py-2.5 text-left">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: GAME_STYLE[g].color } as CSSProperties} />
                      {GAMES[g].name}
                    </span>
                    <span className="ml-4 block text-[11px] text-faint">เซิร์ฟ {REGION_LABEL[GAMES[g].region]}</span>
                  </td>
                  {EVENT_TYPES.map((t) => {
                    const auto = SUPPORTED_TYPES[g].includes(t);
                    const found = events.filter((e) => e.game_id === g && e.type === t);
                    const manual = found.some((e) => e.source_id === 'manual');
                    return (
                      <td key={t} className="px-2 py-2.5 text-xs">
                        {auto ? (
                          <span className="text-ok">อัตโนมัติ</span>
                        ) : manual ? (
                          <span className="text-accent">ผู้ดูแลกรอก</span>
                        ) : found.length ? (
                          <span className="text-warn" title="แหล่งข้อมูลมีบางรายการ แต่ไม่ครบหรือยังตรวจสอบไม่ได้">บางส่วน</span>
                        ) : (
                          <span className="text-faint">ยังไม่รองรับ</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Ennead API ไม่มีวันแพตช์ของเกม HoYoverse และประกาศของ Kuro Games ไม่มีรอบ Endgame ที่เชื่อถือได้ ข้อมูลเหล่านี้จะแสดงเมื่อผู้ดูแลกรอกจากประกาศทางการ
          ระบบไม่คาดเดาวันแพตช์จากวันตู้
        </p>
      </Section>

      <Section title="สถานะของข้อมูล">
        <dl className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
            <div key={s} className="flex gap-3">
              <span className="swatch mt-1 h-3! w-6!" data-status={s} style={{ '--g': 'var(--color-accent)' } as CSSProperties} />
              <div>
                <dt className="text-sm font-medium">{STATUS_LABEL[s]}</dt>
                <dd className="text-xs text-muted">{STATUS_HINT[s]}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="เครดิตและลิขสิทธิ์">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>
            ข้อมูล Genshin Impact, Honkai: Star Rail และ Zenless Zone Zero จาก{' '}
            <a className="text-accent hover:underline" href="https://api.ennead.cc" target="_blank" rel="noopener noreferrer">
              api.ennead.cc
            </a>
          </li>
          <li>ข้อมูล Wuthering Waves จากไฟล์ประกาศในเกมของ Kuro Games เซิร์ฟ SEA</li>
          <li>ชื่อเกม ภาพตัวละคร และภาพประกอบเป็นลิขสิทธิ์ของ HoYoverse และ Kuro Games ตามลำดับ เว็บนี้ไม่มีส่วนเกี่ยวข้องกับผู้พัฒนาเกม</li>
          <li>เวลาในประกาศอาจเปลี่ยนได้ ตรวจสอบประกาศทางการก่อนวางแผนสำคัญเสมอ</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
