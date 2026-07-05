// UNL parser pro PSP Open Data
// Specifikace: encoding windows-1250, delimiter '|', null = literal "_null_",
// escape: backslash-prefixed octal sekvence (\092 = samotný backslash)

import iconv from "iconv-lite";

export type UnlRow = (string | null)[];

export interface UnlStreamOptions {
  /** Skip empty lines */
  skipEmpty?: boolean;
  /** Skip lines starting with '#' */
  skipComments?: boolean;
}

const DEFAULT_OPTS: Required<UnlStreamOptions> = {
  skipEmpty: true,
  skipComments: true,
};

/**
 * Parsuje jeden řádek UNL na pole hodnot.
 * Escape sekvence: \NNN (octal) → chr(NNN)
 * Prázdná hodnota = ""
 * _null_ = null
 */
export function parseUnlLine(line: string): UnlRow {
  const result: UnlRow = [];
  let i = 0;
  let buf = "";

  const push = () => {
    if (buf === "_null_") {
      result.push(null);
    } else if (buf === "") {
      result.push("");
    } else {
      result.push(buf);
    }
    buf = "";
  };

  while (i < line.length) {
    const c = line[i]!;

    if (c === "\\" && i + 3 < line.length) {
      // Escape \NNN (octal, max 3 číslice)
      const m = /^\\([0-7]{1,3})/.exec(line.slice(i));
      if (m && m[1]) {
        const code = parseInt(m[1], 8);
        buf += String.fromCharCode(code);
        i += m[0].length;
        continue;
      }
    }

    if (c === "|") {
      push();
      i++;
      continue;
    }

    buf += c;
    i++;
  }

  push();
  return result;
}

/**
 * Async generator přes buffer (Buffer) — vrací decoded windows-1250 string po řádcích.
 */
export async function* unlLines(buffer: Buffer, opts: UnlStreamOptions = {}): AsyncGenerator<string> {
  const o = { ...DEFAULT_OPTS, ...opts };
  const text = iconv.decode(buffer, "win1250");
  let start = 0;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const c = text.charCodeAt(i);
    // CR, LF, CRLF
    if (c === 10 || c === 13) {
      if (i > start) {
        const line = text.slice(start, i);
        if (yieldLine(line, o)) yield line;
      }
      // skip CRLF
      if (c === 13 && i + 1 < len && text.charCodeAt(i + 1) === 10) i++;
      start = i + 1;
    }
  }

  // poslední řádek bez \n
  if (start < len) {
    const line = text.slice(start);
    if (yieldLine(line, o)) yield line;
  }
}

function yieldLine(line: string, opts: Required<UnlStreamOptions>): boolean {
  const trimmed = line.trim();
  if (opts.skipEmpty && trimmed.length === 0) return false;
  if (opts.skipComments && trimmed.startsWith("#")) return false;
  return true;
}

/**
 * Parsuje celý buffer na pole řádků (hodí se pro testy a menší soubory).
 */
export function unlRows(buffer: Buffer, opts?: UnlStreamOptions): UnlRow[] {
  const out: UnlRow[] = [];
  const text = iconv.decode(buffer, "win1250");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    out.push(parseUnlLine(trimmed));
  }
  return out;
}

/**
 * Pro iteraci nad streamem z ReadableStream (Node).
 */
export async function unlRowsFromStream(stream: ReadableStream<Uint8Array>): Promise<UnlRow[]> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const buffer = Buffer.concat(chunks, total);
  return unlRows(buffer);
}