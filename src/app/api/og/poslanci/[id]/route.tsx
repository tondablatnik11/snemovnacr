// Dynamic OG image pro detail poslance.
import { generateOGImage } from "~/app/og/dynamic-image";
import { getServerCaller } from "~/server/trpc/caller";
import { formatFullName } from "~/lib/format";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caller = await getServerCaller();
  const detail = await caller.poslanci.detail({ id: parseInt(id, 10) });

  if (!detail) {
    return generateOGImage({
      title: "Poslanec nenalezen",
      badge: "Sněmovna ČR",
    });
  }

  return generateOGImage({
    title: formatFullName(detail),
    subtitle: detail.kluby[0]?.nazev,
    badge: detail.obdobiNazev,
  });
}