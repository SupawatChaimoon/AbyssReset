import { useState, type ReactNode } from 'react';
import { Sheet } from './Sheet';

type Props = {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  /** When set, the user must type this word before confirming. */
  requireWord?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ open, title, children, confirmLabel, requireWord, danger = true, onConfirm, onClose }: Props) {
  const [typed, setTyped] = useState('');
  const close = () => {
    setTyped('');
    onClose();
  };
  const ready = !requireWord || typed.trim() === requireWord;
  return (
    <Sheet
      open={open}
      onClose={close}
      width="md:max-w-md"
      title={<h2 className="text-lg font-semibold">{title}</h2>}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={close}>
            ยกเลิก
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            disabled={!ready}
            onClick={() => {
              onConfirm();
              close();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-muted">
        {children}
        {requireWord && (
          <label className="block">
            <span className="label">
              พิมพ์คำว่า <b className="text-fg">{requireWord}</b> เพื่อยืนยัน
            </span>
            <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </label>
        )}
      </div>
    </Sheet>
  );
}
