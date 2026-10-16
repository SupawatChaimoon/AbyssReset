import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CalendarItem } from '../lib/items';
import type { PersonalKind } from './personal';

export type EditorTarget = {
  kind: PersonalKind;
  /** Existing item to edit; omitted when adding. */
  id?: string;
  /** Prefilled date for a new item (YYYY-MM-DD). */
  date?: string;
};

type Toast = { id: number; text: string; tone: 'ok' | 'warn' };

type Ctx = {
  selected: CalendarItem | null;
  select: (item: CalendarItem | null) => void;
  editor: EditorTarget | null;
  openEditor: (t: EditorTarget) => void;
  closeEditor: () => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
};

const UIContext = createContext<Ctx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      selected,
      select: setSelected,
      editor,
      openEditor: (t) => {
        setSelected(null);
        setEditor(t);
      },
      closeEditor: () => setEditor(null),
      toasts,
      toast,
    }),
    [selected, editor, toasts, toast],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI outside UIProvider');
  return ctx;
}
