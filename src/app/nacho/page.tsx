import type { Metadata } from "next";
import { OwnerPortal } from "@/components/owner-portal";

export const metadata: Metadata = { title: "Portal de Nacho | Costume Quest", robots: { index: false, follow: false } };
export default function NachoPage() { return <OwnerPortal />; }
