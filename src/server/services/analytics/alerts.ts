// Alerting — detekuje kontroverzní hlasování a změny v koaliční disciplíně.
// Plně typově bezpečné — žádné `as unknown as`.

import { db } from "~/server/db";
import { sql } from "drizzle-orm";
import { logger } from "~/lib/logger";
import type { ContestedVoteRaw } from "~/server/db/types";

export interface ContestedVoteAlert {
  hlasovaniId: number;
  nazev: string;
  datum: Date;
  pro: number;
  proti: number;
  zdrzel: number;
  /** Maximální koaliční rozptyl — jak moc se koalice rozcházela */
  koaliceRozptyl: number;
}

/**
 * Najde kontroverzní hlasování: úzká výhra/prohra + vysoký rozptyl v koalici.
 * Vrací typově bezpečné výsledky.
 */
export async function findContestedVotes(
  since: Date,
  limit = 10
): Promise<ContestedVoteAlert[]> {
  const rows = await db.execute<ContestedVoteRaw>(sql`
    WITH narrow AS (
      SELECT id, nazev, datum, pro, proti, zdrzel, id_obdobi
      FROM hlasovani
      WHERE datum >= ${since}
        AND vysledek IN ('A','R')
        AND ABS(pro - proti) <= 10
        AND (pro + proti) >= 100
    ),
    koalice_split AS (
      SELECT hp.id_hlasovani,
        COUNT(DISTINCT hp.vysledek) FILTER (WHERE c.role='VLADA') AS koalice_pocet_hlasu
      FROM hlasovani_poslanec hp
      INNER JOIN poslanec p ON p.id = hp.id_poslanec
      INNER JOIN zarazeni z ON z.id_osoba = p.id_osoba AND z.cl_funkce = 0
      INNER JOIN coalition c ON c.id_obdobi = p.id_obdobi AND c.id_organ = z.id_of
      WHERE c.role = 'VLADA' AND hp.vysledek IN ('A','B','N')
      GROUP BY hp.id_hlasovani
    )
    SELECT n.id, n.nazev, n.datum, n.pro, n.proti, n.zdrzel,
      COALESCE(ks.koalice_pocet_hlasu, 0) AS koalice_rozptyl
    FROM narrow n
    LEFT JOIN koalice_split ks ON ks.id_hlasovani = n.id
    ORDER BY ks.koalice_pocet_hlasu DESC, n.datum DESC
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    hlasovaniId: r.id,
    nazev: r.nazev,
    datum: r.datum instanceof Date ? r.datum : new Date(r.datum),
    pro: r.pro,
    proti: r.proti,
    zdrzel: r.zdrzel,
    koaliceRozptyl: Number(r.koalice_rozptyl),
  }));
}

/**
 * Dispatches notifikace pro uživatele sledující daný target.
 * Volá se po novém hlasování nebo změně stavu tisku.
 */
export async function dispatchWatchAlerts(
  targetType: string,
  targetId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { sledovane, notifikace } = await import("~/server/db/schema/participace");
  const { users } = await import("~/server/db/schema/auth");

  const subscribers = await db
    .select()
    .from(sledovane)
    .where(
      sql`${sledovane.targetType} = ${targetType} AND ${sledovane.targetId} = ${targetId}`
    );

  for (const s of subscribers) {
    const channels = (s.channels ?? {}) as { email?: boolean; web?: boolean };

    if (channels.web) {
      await db.insert(notifikace).values({
        idUser: s.idUser,
        typ: "WATCH_NEW_EVENT",
        ref: { targetType, targetId, ...payload },
      });
    }

    if (channels.email) {
      const [u] = await db.select().from(users).where(sql`${users.id} = ${s.idUser}`).limit(1);
      if (u) {
        const { sendNotificationEmail } = await import("~/server/services/notifications/resend");
        await sendNotificationEmail({
          to: u.email,
          subject: `Nová událost: ${payload.nazev ?? targetType}`,
          targetType,
          targetId,
        }).catch((err) => logger.error({ err }, "× Email send failed"));
      }
    }
  }
}