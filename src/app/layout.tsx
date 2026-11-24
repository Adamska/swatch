import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "@fontsource-variable/fraunces/full.css";
import "./globals.css";

function publicOrigin(): URL {
  const configured = process.env.SWATCH_PUBLIC_URL?.trim();
  if (configured) return new URL(configured);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return new URL(vercel ? `https://${vercel}` : "http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: publicOrigin(),
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
