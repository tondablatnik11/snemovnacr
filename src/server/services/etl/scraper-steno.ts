// Scraper: plné texty stenoprotokolů
// Formát: /eknih/{YYYYps}/stenprot/{NNN}schuz/{N}-{M}.html

import * as cheerio from "cheerio";
import { logger } from "~/lib/logger";
import { PSP_BASE_URL } from "~/lib/constants";
import { pspFetch } from "./scraper-psp";

export interface ParsedTurn {
  speakerName: string;
  text: string;
}

/**
 * Scrapne jeden stenoprotokol (jedno zasedání, jeden den)
 */
export async function scrapeStenoHtml(term: number, schuzeCislo: number, day: number): Promise<ParsedTurn[]> {
  const obdobi = `${term}ps`;
  const url = `/eknih/${obdobi}/stenprot/${schuzeCislo}schuz/${day}-${day}.html`;
  const html = await pspFetch(url);
  return parseStenoTurns(html);
}

export function parseStenoTurns(html: string): ParsedTurn[] {
  const $ = cheerio.load(html);
  const turns: ParsedTurn[] = [];

  // Každý projev typicky začíná <b class="speaker">Jméno</b> nebo <p class="rec">...
  // Robustní: parsuj odstavce (p), detekuj jméno na začátku.
  $("p").each((_, el) => {
    const $p = $(el);
    const html = $p.html() ?? "";
    const text = $p.text().trim();
    if (!text) return;

    // Heuristika: jméno je první řádek (<b>, <i>, nebo první slovo) psaný VELKÝMI písmeny
    const m = /^(?:<b>([^<]+)<\/b>|<i>([^<]+)<\/i>|([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+)?))/m.exec(html);
    if (m) {
      const speaker = (m[1] ?? m[2] ?? m[3] ?? "").trim();
      turns.push({ speakerName: speaker, text });
    } else {
      turns.push({ speakerName: "", text });
    }
  });

  return turns;
}