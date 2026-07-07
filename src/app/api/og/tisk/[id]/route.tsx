// Dynamic OG image pro detail tisku.
// Edge runtime — data z URL search params.

import { generateOGImage } from "~/app/og/dynamic-image";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get("title") ?? "Tisk";
  const subtitle = url.searchParams.get("subtitle") ?? "";
  const badge = url.searchParams.get("badge") ?? "Sněmovní tisk";

  return generateOGImage({
    title: title.length > 80 ? title.slice(0, 77) + "…" : title,
    subtitle: subtitle || undefined,
    badge,
  });
}