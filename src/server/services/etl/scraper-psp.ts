// Scraper: stahuje live hlasování a detaily poslanců z psp.cz
// Robots.txt nepokrývá /sqw/ a /eknih/ → povoleno
// Throttle: 1 req/s

import { logger } from "~/lib/logger";
import { PSP_BASE_URL } from "~/lib/constants";

const THROTTLE_MS = 1000;
let lastRequestAt = 0;

async function throttle() {
  const now = Date.now();
  const wait = THROTTLE_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

export async function pspFetch(path: string, signal?: AbortSignal): Promise<string> {
  await throttle();
  const url = path.startsWith("http") ? path : `${PSP_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "SnemovnaCrApp/0.1 (+https://github.com/snemovna-cr) research/bot" },
    signal,
  });
  if (!res.ok) throw new Error(`Scraper ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Scrapne detail jednoho hlasování (per-deputy live, pokud UNL snapshot je starý).
 * URL: /sqw/hlasy.sqw?g=<id>&l=cz
 */
export async function scrapeLiveVote(voteId: number, signal?: AbortSignal) {
  const html = await pspFetch(`/sqw/hlasy.sqw?g=${voteId}&l=cz`, signal);
  return parseHlasyHtml(html, voteId);
}

interface ParsedVoteRow {
  idPoslanec: number;
  jmeno: string;
  klub: string;
  vysledek: string; // A/B/C/F/@/M
}

export function parseHlasyHtml(html: string, voteId: number): { idHlasovani: number; rows: ParsedVoteRow[] } {
  // HTML psp.cz je nevalidní, ale konzistentní — parsujeme tabulky.
  // Tabulka obsahuje buňky: <td>id</td><td>jméno</td><td>strana</td><td>výsledek</td>
  const rows: ParsedVoteRow[] = [];

  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const matches = [...html.matchAll(cellRegex)];
  // seskup po 4 (nebo 5) buňkách na řádek
  let i = 0;
  while (i + 3 < matches.length) {
    const idMatch = matches[i]?.[1];
    const nameMatch = matches[i + 1]?.[1];
    const clubMatch = matches[i + 2]?.[1];
    const resultMatch = matches[i + 3]?.[1];
    if (idMatch === undefined || nameMatch === undefined || clubMatch === undefined || resultMatch === undefined) {
      i += 4;
      continue;
    }
    const idText = stripHtml(idMatch);
    const nameText = stripHtml(nameMatch);
    const clubText = stripHtml(clubMatch);
    const resultText = stripHtml(resultMatch);

    const idNum = parseInt(idText, 10);
    if (!Number.isNaN(idNum) && /^[ABCDF@MWK]$/.test(resultText)) {
      rows.push({
        idPoslanec: idNum,
        jmeno: nameText,
        klub: clubText,
        vysledek: resultText,
      });
    }
    i += 4;
  }

  return { idHlasovani: voteId, rows };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
}

/**
 * Scrapne všechny hlasování z aktuální schůze (fallback pro live data)
 */
export async function scrapeSchuzeVotes(term: number, schuzeId: number, signal?: AbortSignal) {
  const html = await pspFetch(`/sqw/hl.sqw?o=${term}&s=${schuzeId}`, signal);
  // Extrahuj seznam id_hlasovani z odkazů
  const ids = [...html.matchAll(/phlasa\.sqw\?o=\d+&s=\d+&pg=(\d+)/g)].map((m) => parseInt(m[1] ?? "0", 10));
  const idsUniq = [...new Set(ids)].filter((n) => n > 0);
  logger.info({ count: idsUniq.length }, "→ Scrape schuze votes");
  const all: { idHlasovani: number; rows: ParsedVoteRow[] }[] = [];
  for (const id of idsUniq) {
    all.push(await scrapeLiveVote(id, signal));
  }
  return all;
}