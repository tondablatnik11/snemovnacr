// Admin API: update coalition mapping
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { coalition } from "~/server/db/schema/psp";
import { getOptionalUser } from "~/server/auth/perms";
import { eq, and } from "drizzle-orm";

const schema = z.object({
  updates: z.array(z.object({ idOrgan: z.number().int(), role: z.enum(["VLADA", "OPOZICE", "NEZARAZENO"]) })),
});

export async function POST(req: Request) {
  const user = await getOptionalUser();
  if (!user || ((user as { role?: string }).role !== "admin" && (user as { role?: string }).role !== "curator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  for (const u of body.updates) {
    // Smaž staré + vlož nové (pouze pro aktuální období 10)
    await db
      .delete(coalition)
      .where(and(eq(coalition.idOrgan, u.idOrgan), eq(coalition.idObdobi, 10)));
    await db.insert(coalition).values({
      idObdobi: 10,
      idOrgan: u.idOrgan,
      role: u.role,
      platnostOd: new Date().toISOString().slice(0, 10),
      platnostDo: null,
    });
  }

  return NextResponse.json({ ok: true });
}