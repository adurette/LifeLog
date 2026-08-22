import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeLog — Notice what shapes your days",
  description: "A private, flexible life tracker for finding patterns in the things that matter to you.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LifeLog", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#f4f1e9", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
