import type { Metadata } from "next";
import { Studio } from "@/components/Studio";
import { decodeShare } from "@/lib/shareCodec";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function readShareParam(searchParams: PageProps["searchParams"]): Promise<string | null> {
  const value = (await searchParams).s;
  return typeof value === "string" ? value : null;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const encoded = await readShareParam(searchParams);
  const payload = await decodeShare(encoded);
  if (!payload || !encoded) return {};

  const host = new URL(payload.source.url).hostname.replace(/^www\./, "");
  const title = `${payload.tokens.meta.name} · Swatch`;
  const description = `Design tokens extracted from ${host}: colors, type, spacing and exports.`;
  const image = { url: `/og?s=${encoded}`, width: 1200, height: 630, alt: `${payload.tokens.meta.name} specimen` };
  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const payload = await decodeShare(await readShareParam(searchParams));
  return <Studio initialShare={payload} />;
}
