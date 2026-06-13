import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sky Deck — Atmospheric Intelligence",
  description:
    "A map-first sky intelligence platform for discovering extraordinary sunrise, sunset, and night sky viewing experiences.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // allow pinch-zoom for accessibility
  maximumScale: 5,
  themeColor: "#05070d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={interTight.variable}>
      <body>{children}</body>
    </html>
  );
}
