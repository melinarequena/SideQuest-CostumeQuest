import type { ReactNode } from "react";
import { OwnerPresentationProvider } from "@/components/owner-presentation-context";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <OwnerPresentationProvider>{children}</OwnerPresentationProvider>;
}
