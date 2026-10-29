"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Dashboard } from "@/lib/admin-types";

type Presentation = { snapshot: Dashboard | null; snapshotId: number; capture: (dashboard: Dashboard) => void; clear: () => void };
const Context = createContext<Presentation | null>(null);

// Keep the captured results only in this tab's React memory. They are never put
// in URLs or persistent browser storage; each results page still checks access.
export function OwnerPresentationProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Dashboard | null>(null);
  const [snapshotId, setSnapshotId] = useState(0);
  const capture = useCallback((dashboard: Dashboard) => { setSnapshot(structuredClone(dashboard)); setSnapshotId((value) => value + 1); }, []);
  const clear = useCallback(() => { setSnapshot(null); setSnapshotId((value) => value + 1); }, []);
  const value = useMemo(() => ({ snapshot, snapshotId, capture, clear }), [snapshot, snapshotId, capture, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOwnerPresentation() {
  const value = useContext(Context);
  if (!value) throw new Error("El portal necesita su contexto de presentación.");
  return value;
}
