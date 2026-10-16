import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  LIST_OF,
  STORE_KEY,
  emptyStore,
  loadStore,
  parseStore,
  saveStore,
  type PersonalItemOf,
  type PersonalKind,
  type PersonalStore,
  type Settings,
} from './personal';

type Action =
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'upsert'; kind: PersonalKind; item: PersonalItemOf<PersonalKind> }
  | { type: 'remove'; kind: PersonalKind; id: string }
  | { type: 'replace'; store: PersonalStore }
  | { type: 'clear' };

function reducer(state: PersonalStore, action: Action): PersonalStore {
  switch (action.type) {
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'upsert': {
      const key = LIST_OF[action.kind];
      const list = state[key] as { id: string }[];
      const exists = list.some((x) => x.id === action.item.id);
      const next = exists ? list.map((x) => (x.id === action.item.id ? action.item : x)) : [...list, action.item];
      return { ...state, [key]: next };
    }
    case 'remove': {
      const key = LIST_OF[action.kind];
      return { ...state, [key]: (state[key] as { id: string }[]).filter((x) => x.id !== action.id) };
    }
    case 'replace':
      return action.store;
    case 'clear':
      return { ...emptyStore(), settings: state.settings };
  }
}

type Ctx = {
  store: PersonalStore;
  dispatch: (a: Action) => void;
  /** Problem found while loading or saving, shown as a warning. */
  problem: string | null;
};

const PersonalContext = createContext<Ctx | null>(null);

export function PersonalProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadStore());
  const [store, dispatch] = useReducer(reducer, initial.current.store);
  const [problem, setProblem] = useState<string | null>(initial.current.problem ?? null);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    if (!saveStore(store) && !initial.current.problem) {
      setProblem('บันทึกข้อมูลส่วนตัวไม่สำเร็จ พื้นที่เบราว์เซอร์อาจเต็มหรือถูกปิดไว้');
    }
  }, [store]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORE_KEY || !e.newValue) return;
      try {
        fromOtherTab.current = true;
        dispatch({ type: 'replace', store: parseStore(JSON.parse(e.newValue)) });
      } catch {
        fromOtherTab.current = false;
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ store, dispatch, problem }), [store, problem]);
  return <PersonalContext.Provider value={value}>{children}</PersonalContext.Provider>;
}

export function usePersonal() {
  const ctx = useContext(PersonalContext);
  if (!ctx) throw new Error('usePersonal outside PersonalProvider');
  return ctx;
}
