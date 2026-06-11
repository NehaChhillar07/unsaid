import React, { createContext, useContext, useMemo, useState } from 'react';

interface FreshDropsValue {
  count: number;
  setCount: (n: number) => void;
}

const FreshDropsContext = createContext<FreshDropsValue | null>(null);

/** Shares the "N new drops" count between the feed screen and the tab badge. */
export function FreshDropsProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const value = useMemo(() => ({ count, setCount }), [count]);
  return <FreshDropsContext.Provider value={value}>{children}</FreshDropsContext.Provider>;
}

export function useFreshDrops(): FreshDropsValue {
  const v = useContext(FreshDropsContext);
  if (!v) throw new Error('useFreshDrops must be used inside FreshDropsProvider');
  return v;
}
