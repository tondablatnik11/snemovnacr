// App-wide konstanty

export const PSP_BASE_URL = "https://www.psp.cz";

export const PSP_OPEN_DATA = {
  base: `${PSP_BASE_URL}/eknih/cdrom/opendata`,
  snapshots: {
    poslanci: `${PSP_BASE_URL}/eknih/cdrom/opendata/poslanci.zip`,
    hlasovani: (term: number) => {
      // term 9 → 2021ps, term 10 → 2025ps
      const mapping: Record<number, string> = {
        1: "1993",
        2: "1996",
        3: "1998",
        4: "2002",
        5: "2006",
        6: "2010",
        7: "2013",
        8: "2017",
        9: "2021",
        10: "2025",
      };
      const y = mapping[term] ?? "2021";
      return `${PSP_BASE_URL}/eknih/cdrom/opendata/hl-${y}ps.zip`;
    },
    tisky: `${PSP_BASE_URL}/eknih/cdrom/opendata/tisky.zip`,
    schuze: `${PSP_BASE_URL}/eknih/cdrom/opendata/schuze.zip`,
    steno: `${PSP_BASE_URL}/eknih/cdrom/opendata/steno.zip`,
    interp: `${PSP_BASE_URL}/eknih/cdrom/opendata/interp.zip`,
    sbirka: `${PSP_BASE_URL}/eknih/cdrom/opendata/sbirka.zip`,
    sd: `${PSP_BASE_URL}/eknih/cdrom/opendata/sd.zip`,
    senat: `${PSP_BASE_URL}/eknih/cdrom/opendata/se_tisk.zip`,
  },
} as const;

// URL helpery pro detail stránky
export function pspPoslanecUrl(id: number, term: number): string {
  return `${PSP_BASE_URL}/sqw/poslanec.sqw?o=${term}&id=${id}`;
}

export function pspHlasovaniDetailUrl(id: number): string {
  return `${PSP_BASE_URL}/sqw/hlasy.sqw?g=${id}&l=cz`;
}

export function pspTiskUrl(id: number, term: number): string {
  return `${PSP_BASE_URL}/sqw/tisk/tisk.sqw?o=${term}&t=${id}`;
}

export function pspPhotoUrl(idOsoba: number, term: number, small = false): string {
  const obdobi = `${term}ps`.length > 4 ? "2021ps" : `${term}ps`;
  const path = small ? "small" : "";
  return `${PSP_BASE_URL}/eknih/cdrom/${obdobi}/eknih/${obdobi}/poslanci/${path ? path + "/" : ""}i${idOsoba}.jpg`;
}

export const EMBEDDING_DIM = 1024;

export const RAG_TOP_K = 12;

export const DEFAULT_TERM = 10; // 10. volební období (2025–)