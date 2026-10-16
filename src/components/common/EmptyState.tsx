import type { ReactNode } from 'react';

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-muted">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', icon, children, action }: { tone?: 'info' | 'warn' | 'danger'; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  const style = {
    info: 'border-accent/25 bg-accent/8 text-[#c9cfff]',
    warn: 'border-warn/30 bg-warn/10 text-[#f6dc9a]',
    danger: 'border-danger/30 bg-danger/10 text-[#fbb]',
  }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${style}`} role={tone === 'info' ? 'note' : 'alert'}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
