import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconX } from '../icons';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** "side" = right drawer on desktop; "center" = dialog. Both are bottom sheets on mobile. */
  variant?: 'side' | 'center';
  width?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Open sheets, top-most last; only the top one reacts to Escape. */
const stack: symbol[] = [];

export function Sheet({ open, onClose, title, variant = 'center', width = 'md:max-w-lg', children, footer }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    const me = Symbol();
    stack.push(me);
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === me) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(me), 1);
      if (!stack.length) document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const side = variant === 'side';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'relative flex max-h-[88dvh] w-full flex-col overflow-hidden border border-line bg-ink-850 shadow-2xl outline-none',
          'animate-sheet-up rounded-t-3xl',
          side
            ? 'md:absolute md:inset-y-3 md:right-3 md:max-h-none md:w-[440px] md:animate-sheet-left md:rounded-3xl'
            : `md:animate-pop md:rounded-3xl ${width}`,
        ].join(' ')}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15 md:hidden" />
        <header className="flex shrink-0 items-start gap-3 px-5 pt-3 pb-3 md:pt-5">
          <div id={titleId} className="min-w-0 flex-1">
            {title}
          </div>
          <button type="button" className="btn btn-ghost -mr-2 -mt-1 h-9 w-9 px-0" onClick={onClose} aria-label="ปิด">
            <IconX />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-ink-900/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
      </div>
    </div>
  );
}
