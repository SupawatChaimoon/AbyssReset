import { createContext, useContext, type ReactNode } from 'react';
import { usePublicData, type PublicData } from './usePublicData';

const PublicDataContext = createContext<PublicData | null>(null);

export function PublicDataProvider({ children }: { children: ReactNode }) {
  return <PublicDataContext.Provider value={usePublicData()}>{children}</PublicDataContext.Provider>;
}

export function usePublic() {
  const ctx = useContext(PublicDataContext);
  if (!ctx) throw new Error('usePublic outside PublicDataProvider');
  return ctx;
}
