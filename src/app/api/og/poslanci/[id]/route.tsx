// Dynamic OG image pro detail poslance.
// Edge runtime — data z URL search params (metadata zajišťuje Node fetch).

import { generateOGImage } from "~/app/og/dynamic-image";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "Poslanec";
  const club = url.searchParams.get("club") ?? "";
  const term = url.searchParams.get("term") ?? "Sněmovna ČR";

  return generateOGImage({
    title: name,
    subtitle: club || undefined,
    badge: term,
  });
}