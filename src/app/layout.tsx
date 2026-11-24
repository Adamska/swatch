import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "@fontsource-variable/fraunces/full.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swatch",
  description:
    "Inspect any public URL, extract its computed design tokens and turn them into a live styleguide and Tailwind config.",
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
