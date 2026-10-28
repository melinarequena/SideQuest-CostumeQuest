import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Side Quest - Costume Quest",
  description: "Tu disfraz tiene una misión. Subí tu foto y elegí los mejores disfraces de SideQuest - Halloween Party.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
  openGraph: { title: "Side Quest - Costume Quest", description: "Subí tu disfraz. Repartí estrellas. Hacé historia esta Halloween Party.", locale: "es_AR", type: "website" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#000000", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body>{children}</body></html>;
}
