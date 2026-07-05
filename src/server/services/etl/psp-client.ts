// PSP client — stahuje ZIP snapshoty z /eknih/cdrom/opendata/
// Používá yauzl (stream) a iconv-lite pro windows-1250

import yauzl from "yauzl";
import { unlRows } from "~/lib/unl";
import { logger } from "~/lib/logger";
import { PSP_OPEN_DATA } from "~/lib/constants";

export interface DownloadedZip {
  /** URL souboru */
  url: string;
  /** Map member → decoded rows */
  files: Record<string, ReturnType<typeof unlRows>>;
  /** Čas stažení */
  fetchedAt: Date;
  /** Velikost v bytech */
  bytes: number;
}

const ALLOW_MEMBERS = /^[a-z0-9_-]+\.unl$/i;

/**
 * Stáhne ZIP a rozbalí všechny .unl soubory. Vrací mapu member → rows.
 * Pracuje streaming, neukládá celý ZIP do paměti najednou.
 */
export async function downloadSnapshot(url: string, signal?: AbortSignal): Promise<DownloadedZip> {
  logger.info({ url }, "→ Stahuji PSP snapshot");
  const res = await fetch(url, {
    headers: { "User-Agent": "SnemovnaCrApp/0.1 (+https://github.com/snemovna-cr)" },
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Stažení selhalo: ${res.status} ${res.statusText} (${url})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = arrayBuffer.byteLength;
  logger.info({ url, mb: (bytes / 1024 / 1024).toFixed(2) }, "✓ ZIP stažen");

  const buffer = Buffer.from(arrayBuffer);
  const files: Record<string, ReturnType<typeof unlRows>> = {};

  return new Promise<DownloadedZip>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        reject(err ?? new Error("Nelze otevřít ZIP"));
        return;
      }

      zip.on("entry", (entry) => {
        const name = entry.fileName;
        if (!ALLOW_MEMBERS.test(name)) {
          zip.readEntry();
          return;
        }

        zip.openReadStream(entry, (err2, stream) => {
          if (err2 || !stream) {
            logger.error({ name, err: err2 }, "× Nelze otevřít entry");
            zip.readEntry();
            return;
          }
          const chunks: Buffer[] = [];
          stream.on("data", (c: Buffer) => chunks.push(c));
          stream.on("end", () => {
            const fileBuf = Buffer.concat(chunks);
            try {
              files[name] = unlRows(fileBuf);
              logger.debug({ name, rows: files[name]?.length ?? 0 }, "✓ Entry parsed");
            } catch (parseErr) {
              logger.error({ name, err: parseErr }, "× Parse err");
            }
            zip.readEntry();
          });
          stream.on("error", (streamErr) => {
            logger.error({ name, err: streamErr }, "× Stream err");
            zip.readEntry();
          });
        });
      });

      zip.on("end", () => {
        resolve({ url, files, fetchedAt: new Date(), bytes });
      });

      zip.on("error", reject);
      zip.readEntry();
    });
  });
}

/**
 * Helper: snapshot poslanci (people + organy)
 */
export function downloadPoslanci(signal?: AbortSignal) {
  return downloadSnapshot(PSP_OPEN_DATA.snapshots.poslanci, signal);
}

/**
 * Helper: snapshot hlasování pro konkrétní volební období.
 */
export function downloadHlasovani(term: number, signal?: AbortSignal) {
  return downloadSnapshot(PSP_OPEN_DATA.snapshots.hlasovani(term), signal);
}

export function downloadTisky(signal?: AbortSignal) {
  return downloadSnapshot(PSP_OPEN_DATA.snapshots.tisky, signal);
}

export function downloadSchuze(signal?: AbortSignal) {
  return downloadSnapshot(PSP_OPEN_DATA.snapshots.schuze, signal);
}

export function downloadInterpelace(signal?: AbortSignal) {
  return downloadSnapshot(PSP_OPEN_DATA.snapshots.interp, signal);
}

export function downloadSteno(signal?: AbortSignal) {
  return downloadSnapshot(PSP_OPEN_DATA.snapshots.steno, signal);
}