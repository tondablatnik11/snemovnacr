// Manuální embed všech chybějících záznamů

import "dotenv/config";
import { db } from "~/server/db";
import { hlasovani, tisk, rec } from "~/server/db/schema/psp";
import { isNull, sql } from "drizzle-orm";
import { generateEmbeddings } from "~/server/services/ai/embeddings";

async function main() {
  const target = process.argv[2] ?? "all";

  if (target === "all" || target === "hlasovani") {
    const rows = await db.select({ id: hlasovani.id, text: hlasovani.nazev }).from(hlasovani).where(isNull(hlasovani.embedding));
    console.log(`→ Embedding ${rows.length} hlasování…`);
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const vectors = await generateEmbeddings(slice.map((r) => r.text));
      for (let j = 0; j < slice.length; j++) {
        await db.update(hlasovani).set({ embedding: vectors[j]! }).where(sql`id = ${slice[j]!.id}`);
      }
      console.log(`  ${i + slice.length}/${rows.length}`);
    }
  }

  if (target === "all" || target === "tisk") {
    const rows = await db.select({ id: tisk.id, text: tisk.nazev }).from(tisk).where(isNull(tisk.embedding));
    console.log(`→ Embedding ${rows.length} tisků…`);
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const vectors = await generateEmbeddings(slice.map((r) => r.text));
      for (let j = 0; j < slice.length; j++) {
        await db.update(tisk).set({ embedding: vectors[j]! }).where(sql`id = ${slice[j]!.id}`);
      }
      console.log(`  ${i + slice.length}/${rows.length}`);
    }
  }

  if (target === "all" || target === "rec") {
    const rows = await db.select({ id: rec.id, text: rec.recText }).from(rec).where(isNull(rec.embedding));
    console.log(`→ Embedding ${rows.length} projevů…`);
    const BATCH = 20;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH).filter((r) => r.text);
      const vectors = await generateEmbeddings(slice.map((r) => r.text!));
      for (let j = 0; j < slice.length; j++) {
        await db.update(rec).set({ embedding: vectors[j]! }).where(sql`id = ${slice[j]!.id}`);
      }
      console.log(`  ${i + slice.length}/${rows.length}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});