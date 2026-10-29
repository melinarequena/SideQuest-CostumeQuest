import type { Metadata } from "next";
import { OwnerPortal } from "@/components/owner-portal";

export const metadata: Metadata = { title: "Resultados | Costume Quest", robots: { index: false, follow: false } };
export default function ResultsPage() { return <OwnerPortal view="results" />; }
