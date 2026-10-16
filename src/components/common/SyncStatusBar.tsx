import { Link } from 'react-router';
import type { PublicData } from '../../data/usePublicData';
import { formatDateTime } from '../../lib/dates';
import { GAMES } from '../../lib/gameMeta';
import { IconAlert, IconDatabase, IconRefresh } from '../icons';
import { Notice } from './EmptyState';

/** Yellow warnings above the calendar: failed sources or data served from the cache (FR-10, AC-7). */
export function SyncWarnings({ data }: { data: PublicData }) {
  const failed = data.status?.sources.filter((s) => !s.ok) ?? [];
  return (
    <>
      {data.error && (
        <Notice
          tone="warn"
          icon={<IconAlert size={16} />}
          action={
            <button type="button" className="btn btn-soft h-8" onClick={data.reload}>
              <IconRefresh size={14} /> ลองใหม่
            </button>
          }
        >
          โหลดข้อมูลล่าสุดไม่สำเร็จ
          {data.events.length
            ? ` กำลังแสดงข้อมูลที่บันทึกไว้${data.cachedAt ? `เมื่อ ${formatDateTime(new Date(data.cachedAt))}` : ''}`
            : ' และยังไม่มีข้อมูลที่บันทึกไว้ในเครื่อง'}
        </Notice>
      )}
      {failed.map((s) => (
        <Notice key={s.source_id} tone="warn" icon={<IconAlert size={16} />}>
          ข้อมูล {s.game_id ? GAMES[s.game_id].name : 'ที่ผู้ดูแลกรอก'} อาจไม่ล่าสุด
          {s.last_success_at ? ` แสดงข้อมูลจากวันที่ ${formatDateTime(new Date(s.last_success_at))}` : ' ยังไม่เคยดึงข้อมูลสำเร็จ'}
        </Notice>
      ))}
    </>
  );
}

export function SyncStatusBar({ data }: { data: PublicData }) {
  const generated = data.status?.generated_at;
  const anyFailed = data.status?.sources.some((s) => !s.ok);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-line bg-ink-900/60 px-4 py-2.5 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${data.error || anyFailed ? 'bg-warn' : 'bg-ok'} shadow-[0_0_8px_currentColor]`} />
        {data.loading ? 'กำลังตรวจข้อมูลใหม่…' : generated ? `อัปเดตข้อมูลล่าสุด ${formatDateTime(new Date(generated))}` : 'ยังไม่ทราบเวลาอัปเดต'}
      </span>
      <span className="hidden sm:inline">· เวลาทั้งหมดแสดงตามเวลาเครื่องของคุณ</span>
      <Link to="/about" className="ml-auto inline-flex items-center gap-1 font-medium text-accent hover:underline">
        <IconDatabase size={13} /> แหล่งข้อมูล
      </Link>
    </div>
  );
}
