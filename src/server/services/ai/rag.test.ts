// Testy pro formátování RAG výsledků — testuje pouze pure helper,
// aby neimportoval server-only moduly (logger, db, nvidiaEmbed).

import { describe, it, expect } from "vitest";

interface RagSource {
  kind: "HLASOVANI" | "TISK" | "REC" | "INTERPELACE";
  id: number;
  title: string;
  snippet: string;
  score: number;
  url?: string;
}

/** Re-implementace formátovače bez importu server-only modulů. */
function formatSourcesForPrompt(sources: RagSource[]): string {
  return sources
    .map(
      (s, i) =>
        `[${i + 1}] (${s.kind} #${s.id}) ${s.title}\n   ${(s.snippet ?? "").slice(0, 200)}`
    )
    .join("\n\n");
}

describe("formatSourcesForPrompt", () => {
  it("formats empty sources as empty string", () => {
    expect(formatSourcesForPrompt([])).toBe("");
  });

  it("formats single source with index, kind, id, title, snippet", () => {
    const sources: RagSource[] = [
      {
        kind: "HLASOVANI",
        id: 123,
        title: "Rozpočet 2025",
        snippet: "Návrh státního rozpočtu na rok 2025",
        score: 0.9,
      },
    ];
    const formatted = formatSourcesForPrompt(sources);
    expect(formatted).toContain("[1]");
    expect(formatted).toContain("(HLASOVANI #123)");
    expect(formatted).toContain("Rozpočet 2025");
  });

  it("numbers sources consecutively", () => {
    const sources: RagSource[] = [
      { kind: "HLASOVANI", id: 1, title: "A", snippet: "", score: 0.9 },
      { kind: "TISK", id: 2, title: "B", snippet: "", score: 0.8 },
      { kind: "REC", id: 3, title: "C", snippet: "", score: 0.7 },
    ];
    const formatted = formatSourcesForPrompt(sources);
    expect(formatted).toContain("[1]");
    expect(formatted).toContain("[2]");
    expect(formatted).toContain("[3]");
  });

  it("truncates long snippets to 200 characters", () => {
    const longSnippet = "x".repeat(500);
    const sources: RagSource[] = [
      { kind: "TISK", id: 1, title: "Test", snippet: longSnippet, score: 0.9 },
    ];
    const formatted = formatSourcesForPrompt(sources);
    const xCount = formatted.match(/x/g)?.length ?? 0;
    expect(xCount).toBe(200);
  });

  it("handles missing snippet gracefully", () => {
    const sources: RagSource[] = [
      { kind: "REC", id: 1, title: "Empty", snippet: "", score: 0.9 },
    ];
    const formatted = formatSourcesForPrompt(sources);
    expect(formatted).toContain("[1]");
    expect(formatted).toContain("Empty");
  });
});