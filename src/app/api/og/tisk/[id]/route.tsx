// Dynamic OG image pro detail tisku.
import { generateOGImage } from "~/app/og/dynamic-image";
import { getServerCaller } from "~/server/trpc/caller";
import { formatTiskId } from "~/lib/format";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.tisk.detail({ id: parseInt(id, 10) });

  if (!detail) {
    return generateOGImage({
      title: "Tisk nenalezen",
      badge: "Sněmovna ČR",
    });
  }

  return generateOGImage({
    title: detail.nazev.length > 80 ? detail.nazev.slice(0, 77) + "…" : detail.nazev,
    subtitle: `Tisk č. ${formatTiskId(detail.cislo, detail.cisloZa)}${
      detail.druh ? ` · ${detail.druh.replace("_", " ")}` : ""
    }`,
    badge: detail.datumDoruceni
      ? `Doručeno ${new Date(detail.datumDoruceni).toLocaleDateString("cs-CZ")}`
      : "Sněmovní tisk",
  });
}