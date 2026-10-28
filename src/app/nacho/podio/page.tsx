import type { Metadata } from "next";
import { OwnerPortal } from "@/components/owner-portal";

export const metadata: Metadata = { title: "Podio | Portal de Nacho", robots: { index: false, follow: false } };
export default function PodioPage() { return <OwnerPortal view="podium" />; }
