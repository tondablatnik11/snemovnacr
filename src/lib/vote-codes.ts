// Diskriminovaná unie pro hlasovací kódy podle specifikace PSP UNL
// A=yes, B/N=no, C=abstain, F=no-vote, @=not-logged-in, M=excused, W=pre-oath, K=legacy

export const VOTE_CODES = ["A", "B", "N", "C", "F", "@", "M", "W", "K"] as const;
export type VoteCode = (typeof VOTE_CODES)[number];

export type VoteResult =
  | { code: "A"; label: "pro"; tone: "yes" }
  | { code: "B" | "N"; label: "proti"; tone: "no" }
  | { code: "C"; label: "zdržel se"; tone: "abstain" }
  | { code: "F"; label: "nehlasoval"; tone: "absent" }
  | { code: "@"; label: "nepřihlášen"; tone: "absent" }
  | { code: "M"; label: "omluven"; tone: "absent" }
  | { code: "W"; label: "před složením slibu"; tone: "absent" }
  | { code: "K"; label: "omluven-zdržel (legacy)"; tone: "abstain" };

export function decodeVote(raw: string | null | undefined): VoteResult {
  const code = (raw ?? "").trim().toUpperCase() as VoteCode;
  switch (code) {
    case "A":
      return { code, label: "pro", tone: "yes" };
    case "B":
    case "N":
      return { code, label: "proti", tone: "no" };
    case "C":
      return { code, label: "zdržel se", tone: "abstain" };
    case "F":
      return { code, label: "nehlasoval", tone: "absent" };
    case "@":
      return { code, label: "nepřihlášen", tone: "absent" };
    case "M":
      return { code, label: "omluven", tone: "absent" };
    case "W":
      return { code, label: "před složením slibu", tone: "absent" };
    case "K":
      return { code, label: "omluven-zdržel (legacy)", tone: "abstain" };
    default:
      // Fallback: neplatný kód — mapujeme na "@" (nepřihlášen) jako terminologicky
      // nejpřesnější ("neznámý" nelze rozlišit od skutečně nepřihlášeného poslance).
      return { code: "@", label: "nepřihlášen", tone: "absent" };
  }
}

export function isYes(code: VoteCode): boolean {
  return code === "A";
}
export function isNo(code: VoteCode): boolean {
  return code === "B" || code === "N";
}
export function isAbstain(code: VoteCode): boolean {
  return code === "C" || code === "K";
}
export function isAbsent(code: VoteCode): boolean {
  return code === "F" || code === "@" || code === "M" || code === "W";
}

export function voteTone(code: VoteCode): "yes" | "no" | "abstain" | "absent" {
  if (isYes(code)) return "yes";
  if (isNo(code)) return "no";
  if (isAbstain(code)) return "abstain";
  return "absent";
}

export const VOTE_CODE_CLASS: Record<string, string> = {
  A: "bg-vote-pro text-white",
  B: "bg-vote-proti text-white",
  N: "bg-vote-proti text-white",
  C: "bg-vote-zdrzel text-black",
  F: "bg-vote-nehlasoval text-white",
  "@": "bg-vote-nepihlasen text-white",
  M: "bg-vote-omluven text-white",
  W: "bg-vote-omluven text-white",
  K: "bg-vote-zdrzel text-black",
  "?": "bg-muted text-white",
};