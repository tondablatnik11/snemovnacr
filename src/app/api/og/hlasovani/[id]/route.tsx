// Dynamic OG image pro detail hlasování.
// Edge runtime — proto neimportujeme DB (vyžaduje Node.js perf_hooks).
// Místo toho parsujeme data z URL search params (?název=...&pro=...&proti=...&zdrzel=...).
// Plná data se natahují v metadata (kde běží Node runtime) a předávají se sem.

import { generateOGImage } from "~/app/og/dynamic-image";

export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get("title") ?? "Hlasování";
  const pro = parseInt(url.searchParams.get("pro") ?? "0", 10);
  const proti = parseInt(url.searchParams.get("proti") ?? "0", 10);
  const zdrzel = parseInt(url.searchParams.get("zdrzel") ?? "0", 10);
  const date = url.searchParams.get("date") ?? "";
  const badge = url.searchParams.get("badge") ?? "Hlasování";

  return generateOGImage({
    title: title.length > 80 ? title.slice(0, 77) + "…" : title,
    subtitle: date || undefined,
    badge,
    stats: [
      { label: "Pro", value: String(pro), color: "#22c55e" },
      { label: "Proti", value: String(proti), color: "#ef4444" },
      { label: "Zdržel se", value: String(zdrzel), color: "#f59e0b" },
    ],
  });
}