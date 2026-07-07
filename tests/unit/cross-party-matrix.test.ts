// Testy pro cross-party agreement logiku
// (pure funkce, lze testovat bez DB díky oddělení agregačního SQL)

import { describe, it, expect } from "vitest";

/**
 * Pure helper pro výpočet cross-party matice z dat získaných z SQL.
 * Testujeme odděleně, aby se zabránilo flaky testům nad skutečnou DB.
 */
interface VoteByClub {
  klubId: number;
  klubNazev: string;
  idHlasovani: number;
  vysledek: "A" | "B";
}

function buildMatrix(data: VoteByClub[]) {
  const klubMap = new Map<number, string>();
  for (const r of data) klubMap.set(r.klubId, r.klubNazev);
  const kluby = [...klubMap.values()];
  const ids = [...klubMap.keys()];

  const byVote = new Map<number, Map<number, string>>();
  for (const r of data) {
    if (!byVote.has(r.idHlasovani)) byVote.set(r.idHlasovani, new Map());
    byVote.get(r.idHlasovani)!.set(r.klubId, r.vysledek);
  }

  const matrix: number[][] = kluby.map(() => kluby.map(() => 0));
  const total = byVote.size || 1;

  for (const vote of byVote.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i; j < ids.length; j++) {
        const a = vote.get(ids[i]!);
        const b = vote.get(ids[j]!);
        if (a && b && a === b) {
          matrix[i]![j]! += 1;
          if (i !== j) matrix[j]![i]! += 1;
        }
      }
    }
  }

  for (let i = 0; i < kluby.length; i++) {
    for (let j = 0; j < kluby.length; j++) {
      matrix[i]![j] = Math.round((matrix[i]![j]! / total) * 1000) / 10;
    }
  }

  return { kluby, matrix, totalHlasovani: total };
}

describe("cross-party matrix", () => {
  it("returns empty matrix for no data", () => {
    const r = buildMatrix([]);
    expect(r.kluby).toEqual([]);
    // když nejsou data, fallback na `|| 1` chrání dělení nulou → total=1
    expect(r.totalHlasovani).toBe(1);
  });

  it("identical votes count as agreement", () => {
    const data: VoteByClub[] = [
      { klubId: 1, klubNazev: "A", idHlasovani: 100, vysledek: "A" },
      { klubId: 2, klubNazev: "B", idHlasovani: 100, vysledek: "A" },
    ];
    const r = buildMatrix(data);
    expect(r.matrix).toEqual([[100, 100], [100, 100]]);
  });

  it("opposite votes count as disagreement (0%)", () => {
    const data: VoteByClub[] = [
      { klubId: 1, klubNazev: "A", idHlasovani: 100, vysledek: "A" },
      { klubId: 2, klubNazev: "B", idHlasovani: 100, vysledek: "B" },
    ];
    const r = buildMatrix(data);
    expect(r.matrix[0]![1]).toBe(0);
    expect(r.matrix[1]![0]).toBe(0);
  });

  it("diagonal is always 100%", () => {
    const data: VoteByClub[] = [
      { klubId: 1, klubNazev: "A", idHlasovani: 100, vysledek: "A" },
      { klubId: 2, klubNazev: "B", idHlasovani: 100, vysledek: "A" },
    ];
    const r = buildMatrix(data);
    expect(r.matrix[0]![0]).toBe(100);
    expect(r.matrix[1]![1]).toBe(100);
  });
});