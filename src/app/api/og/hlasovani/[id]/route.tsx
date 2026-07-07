// Dynamic OG image pro detail hlasování.
import { generateOGImage } from "~/app/og/dynamic-image";
import { getServerCaller } from "~/server/trpc/caller";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.hlasovani.detail({ id: parseInt(id, 10) });

  if (!detail) {
    return generateOGImage({
      title: "Hlasování nenalezeno",
      badge: "Sněmovna ČR",
    });
  }

  const pro = detail.pro ?? 0;
  const proti = detail.proti ?? 0;
  const zdrzel = detail.zdrzel ?? 0;

  return generateOGImage({
    title: detail.nazev.length > 80 ? detail.nazev.slice(0, 77) + "…" : detail.nazev,
    subtitle: detail.datum ? new Date(detail.datum).toLocaleDateString("cs-CZ") : undefined,
    badge: `Hlasování ${detail.idSchuze ? `· ${detail.idSchuze}. schůze` : ""}`,
    stats: [
      { label: "Pro", value: String(pro), color: "#22c55e" },
      { label: "Proti", value: String(proti), color: "#ef4444" },
      { label: "Zdržel se", value: String(zdrzel), color: "#f59e0b" },
    ],
  });
}