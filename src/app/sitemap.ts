// Sitemap — statické + dynamické stránky z databáze.
// Optimalizováno: dynamické URL jsou limitovány a stránkované, aby sitemap
// nezahlcovala crawlery.

import type { MetadataRoute } from "next";
import { getServerCaller } from "~/server/trpc/caller";
import { env } from "~/lib/env";

const DYNAMIC_LIMIT = 200; // max počet dynamických URL v sitemap

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/poslanci`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/hlasovani`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/navrhy`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/kluby`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/schuze`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/analyzy`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/ai`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/petice`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
  ];

  let dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const caller = await getServerCaller();
    const term = (await caller.poslanci.currentTerm())?.id ?? 10;

    // Paralelní dotazy s limitem — sitemap by měl být rychlý i s velkou DB
    const [hlasovani, poslanci, tisk] = await Promise.all([
      caller.hlasovani.list({ term, pageSize: DYNAMIC_LIMIT }),
      caller.poslanci.list({ term, pageSize: DYNAMIC_LIMIT }),
      caller.tisk.list({ term, pageSize: DYNAMIC_LIMIT }),
    ]);

    dynamicPages = [
      ...hlasovani.map((v) => ({
        url: `${baseUrl}/hlasovani/${v.id}`,
        lastModified: v.datum ?? now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...poslanci.map((p) => ({
        url: `${baseUrl}/poslanci/${p.id}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
      ...tisk.map((t) => ({
        url: `${baseUrl}/navrhy/${t.id}`,
        lastModified: t.datumDoruceni ? new Date(t.datumDoruceni) : now,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    // DB nedostupná — sitemap bude obsahovat pouze statické stránky
  }

  return [...staticPages, ...dynamicPages];
}