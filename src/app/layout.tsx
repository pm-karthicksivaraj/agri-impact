/* The Google Fonts <link> tags below follow the exact font spec provided by
   the project owner (Space Mono). In the App Router these links are hoisted
   by React 19 into <head> — the pages/_document rule does not apply. */
/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/agri/ThemeProvider";

export const metadata: Metadata = {
  title: "AgriImpact — Precision irrigation with measured impact",
  description:
    "Map your field, get FAO-56 root-zone moisture forecasts on live weather, act on advisories, and measure the water, energy, carbon and yield impact — MRV-grade, audit-ready.",
  keywords: [
    "precision agriculture",
    "irrigation advisory",
    "soil moisture",
    "water savings",
    "MRV",
    "sustainability",
    "SDG 6",
    "smallholder",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "AgriImpact — Precision irrigation with measured impact",
    description:
      "Root-zone moisture forecasts on live weather, with MRV-grade impact measurement.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        {/* Space Mono — provided font spec (Google Fonts) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap"
        />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
