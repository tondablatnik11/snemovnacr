// Seed: aktuální koalice vs opozice pro 10. volební období (2025–)
// Tato data NEJSOU v PSP Open Data — musí se kurátorovat.

import { db } from "../index";
import { coalition, organ } from "../schema/psp";
import { eq, and } from "drizzle-orm";

interface ClubMapping {
  obdobi: number;
  klubNazev: string; // match by organ.nazev
  role: "VLADA" | "OPOZICE" | "NEZARAZENO";
  platnostOd: string;
}

export const DEFAULT_COALITION: ClubMapping[] = [
  // 10. období (2025–) — Fiala vláda + 2 nové kluby po volbách 2025
  // Poznámka: po volbách 2025 vznikla koalice SPOLU+STAN+Motoristé+Piráti,
  // tato mapa se bude muset aktualizovat po reálném ustavení Sněmovny.
  { obdobi: 10, klubNazev: "SPOLU", role: "VLADA", platnostOd: "2025-01-01" },
  { obdobi: 10, klubNazev: "Piráti", role: "VLADA", platnostOd: "2025-01-01" },
  { obdobi: 10, klubNazev: "STAN", role: "VLADA", platnostOd: "2025-01-01" },
  { obdobi: 10, klubNazev: "ANO", role: "OPOZICE", platnostOd: "2025-01-01" },
  { obdobi: 10, klubNazev: "SPD", role: "OPOZICE", platnostOd: "2025-01-01" },
  { obdobi: 10, klubNazev: "Stačilo!", role: "OPOZICE", platnostOd: "2025-01-01" },
  { obdobi: 10, klubNazev: "Motoristé", role: "VLADA", platnostOd: "2025-01-01" },
  // 9. období (2021–2025) — Fiala vláda
  { obdobi: 9, klubNazev: "SPOLU", role: "VLADA", platnostOd: "2021-10-01" },
  { obdobi: 9, klubNazev: "Piráti", role: "VLADA", platnostOd: "2021-10-01" },
  { obdobi: 9, klubNazev: "STAN", role: "VLADA", platnostOd: "2021-10-01" },
  { obdobi: 9, klubNazev: "ANO", role: "OPOZICE", platnostOd: "2021-10-01" },
  { obdobi: 9, klubNazev: "SPD", role: "OPOZICE", platnostOd: "2021-10-01" },
  { obdobi: 9, klubNazev: "KSČM", role: "OPOZICE", platnostOd: "2021-10-01" },
  { obdobi: 9, klubNazev: "ČSSD", role: "OPOZICE", platnostOd: "2021-10-01" },
];

export async function seedCoalition() {
  console.log("→ Seed coalition…");
  for (const m of DEFAULT_COALITION) {
    // Najdi organ podle názvu + období
    const rows = await db
      .select({ id: organ.id })
      .from(organ)
      .where(and(eq(organ.idObdobi, m.obdobi), eq(organ.nazev, m.klubNazev)))
      .limit(1);

    if (rows.length === 0) {
      console.warn(`  ⚠ Klub "${m.klubNazev}" (období ${m.obdobi}) nenalezen — přeskočeno.`);
      continue;
    }

    const organId = rows[0]!.id;

    // Upsert: smaž existující záznam pro (období, organ) a vlož nový
    await db
      .delete(coalition)
      .where(and(eq(coalition.idObdobi, m.obdobi), eq(coalition.idOrgan, organId)));

    await db.insert(coalition).values({
      idObdobi: m.obdobi,
      idOrgan: organId,
      role: m.role,
      platnostOd: m.platnostOd,
      platnostDo: null,
    });

    console.log(`  ✓ ${m.klubNazev} (obd. ${m.obdobi}) → ${m.role}`);
  }
}