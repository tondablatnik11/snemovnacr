// Schema pro data Poslanecké sněmovny (z PSP UNL Open Data)
// Embeddings jsou vector(1024) — velikost odpovídá NV-Embed-v2 / arctic-embed-l

import {
  pgTable,
  text,
  integer,
  timestamp,
  date,
  boolean,
  uniqueIndex,
  index,
  primaryKey,
  pgEnum,
  char,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// pgvector column
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1024)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    if (!value) return [];
    return value.slice(1, -1).split(",").map(Number);
  },
});

// Enums
export const organTyp = pgEnum("organ_typ", [
  "KLUB",      // poslanecký klub
  "VYBOR",     // výbor
  "KOMISE",    // komise
  "DELEGACE",  // delegace
  "PODVYBOR",  // podvýbor
  "JINY",
]);

export const coalitionRole = pgEnum("coalition_role", ["VLADA", "OPOZICE", "NEZARAZENO"]);

export const druhTisku = pgEnum("druh_tisku", [
  "NAVRH_ZAKONA",
  "DOPIS",
  "ZPRAVA",
  "USNESENI",
  "ROZPOR",
  "INTERPELACE",
  "JINY",
]);

// ===== Volební období =====
export const volebniObdobi = pgTable("volebni_obdobi", {
  id: integer("id").primaryKey(),   // 1..10
  cislo: integer("cislo").notNull(),
  nazev: text("nazev").notNull(),
  datumOd: date("datum_od").notNull(),
  datumDo: date("datum_do"),
  aktualni: boolean("aktualni").notNull().default(false),
});

// ===== Osoby =====
export const osoba = pgTable(
  "osoba",
  {
    id: integer("id").primaryKey(),
    jmeno: text("jmeno").notNull(),
    prijmeni: text("prijmeni").notNull(),
    titulPred: text("titul_pred"),
    titulZa: text("titul_za"),
    narozeni: date("narozeni"),
    pohlavi: char("pohlavi", { length: 1 }), // 'M' / 'Z'
    fotoUrl: text("foto_url"),
    zemrel: boolean("zemrel").notNull().default(false),
    zmena: timestamp("zmena", { withTimezone: true }),
  },
  (t) => ({
    prijmeniIdx: index("osoba_prijmeni_idx").on(t.prijmeni),
    jmenoPrijmeniIdx: index("osoba_jmeno_prijmeni_idx").on(t.jmeno, t.prijmeni),
  })
);

// ===== Organy + typy + funkce =====
export const typOrganu = pgTable("typ_organu", {
  id: integer("id").primaryKey(),
  typ: organTyp("typ").notNull(),
  nazev: text("nazev").notNull(),
  popis: text("popis"),
});

export const organ = pgTable(
  "organ",
  {
    id: integer("id").primaryKey(),
    idTyp: integer("id_typ").notNull().references(() => typOrganu.id),
    idObdobi: integer("id_obdobi").notNull().references(() => volebniObdobi.id),
    nazev: text("nazev").notNull(),
    zkratka: text("zkratka"),
    clOrganBase: integer("cl_organ_base"),
    priorita: integer("priorita").default(0),
  },
  (t) => ({
    obdobiNazevIdx: index("organ_obdobi_nazev_idx").on(t.idObdobi, t.nazev),
  })
);

export const funkce = pgTable(
  "funkce",
  {
    id: integer("id").primaryKey(),
    idOrgan: integer("id_organ").notNull().references(() => organ.id),
    nazev: text("nazev").notNull(), // předseda, místopředseda, člen, ověřovatel…
  },
  (t) => ({
    organNazevIdx: uniqueIndex("funkce_organ_nazev_uq").on(t.idOrgan, t.nazev),
  })
);

// Polymorfní FK: id_of je buď organ.id (cl_funkce=0, členství) NEBO funkce.id (cl_funkce=1, role)
export const zarazeni = pgTable(
  "zarazeni",
  {
    id: integer("id").primaryKey(),
    idOsoba: integer("id_osoba").notNull().references(() => osoba.id),
    clFunkce: integer("cl_funkce").notNull(), // 0 = členství, 1 = funkce
    idOf: integer("id_of").notNull(),
    odO: date("od_o"),
    doO: date("do_o"),
    odF: date("od_f"),
    doF: date("do_f"),
  },
  (t) => ({
    osobaIdx: index("zarazeni_osoba_idx").on(t.idOsoba),
    organIdIdx: index("zarazeni_organ_id_idx").on(t.idOf),
  })
);

// ===== Poslanec (mandát) =====
export const poslanec = pgTable(
  "poslanec",
  {
    id: integer("id").primaryKey(),
    idOsoba: integer("id_osoba").notNull().references(() => osoba.id),
    idObdobi: integer("id_obdobi").notNull().references(() => volebniObdobi.id),
    idKandidatka: integer("id_kandidatka").references(() => organ.id),
    region: text("region"),
    web: text("web"),
    email: text("email"),
    telefon: text("telefon"),
  },
  (t) => ({
    obdobiOsobaIdx: uniqueIndex("poslanec_obdobi_osoba_uq").on(t.idObdobi, t.idOsoba),
  })
);

// ===== Schůze (plenární) + body =====
export const schuze = pgTable(
  "schuze",
  {
    id: integer("id").primaryKey(),
    idObdobi: integer("id_obdobi").notNull().references(() => volebniObdobi.id),
    cislo: integer("cislo").notNull(),
    nazev: text("nazev"),
    datumOd: date("datum_od"),
    datumDo: date("datum_do"),
    stav: text("stav"),
  },
  (t) => ({
    obdobiCisloUq: uniqueIndex("schuze_obdobi_cislo_uq").on(t.idObdobi, t.cislo),
  })
);

export const bodSchuze = pgTable(
  "bod_schuze",
  {
    id: integer("id").primaryKey(),
    idSchuze: integer("id_schuze").notNull().references(() => schuze.id),
    poradi: integer("poradi").notNull(),
    idTisk: integer("id_tisk"),
    nazev: text("nazev"),
    typBodu: text("typ_bodu"),
    stav: text("stav"),
  },
  (t) => ({
    schuzePoradiUq: uniqueIndex("bod_schuze_schuze_poradi_uq").on(t.idSchuze, t.poradi),
  })
);

// ===== Hlasování =====
export const hlasovani = pgTable(
  "hlasovani",
  {
    id: integer("id").primaryKey(),
    idObdobi: integer("id_obdobi").notNull().references(() => volebniObdobi.id),
    idSchuze: integer("id_schuze").references(() => schuze.id),
    idBod: integer("id_bod").references(() => bodSchuze.id),
    datum: timestamp("datum", { withTimezone: true }),
    cas: text("cas"),
    druhHlasovani: char("druh_hlasovani", { length: 1 }),
    vysledek: char("vysledek", { length: 1 }), // A=accepted, R=rejected, X/Q/K=other
    pro: integer("pro"),
    proti: integer("proti"),
    zdrzel: integer("zdrzel"), // merged: abstain + no-vote
    prihlaseno: integer("prihlaseno"),
    kvorum: integer("kvorum"),
    nazev: text("nazev").notNull(),
    popis: text("popis"),
    idTisk: integer("id_tisk"),
    embedding: vector("embedding"),
  },
  (t) => ({
    datumIdx: index("hlasovani_datum_idx").on(t.datum),
    obdobiIdx: index("hlasovani_obdobi_idx").on(t.idObdobi),
    schuzeIdx: index("hlasovani_schuze_idx").on(t.idSchuze),
    // Vector similarity — HNSW index je v raw SQL migraci (drizzle-kit neumí HNSW)
    fulltextIdx: index("hlasovani_nazev_idx").using("gin", sql`to_tsvector('simple', ${t.nazev})`),
  })
);

export const hlasovaniPoslanec = pgTable(
  "hlasovani_poslanec",
  {
    id: integer("id").primaryKey(),
    idHlasovani: integer("id_hlasovani").notNull().references(() => hlasovani.id, { onDelete: "cascade" }),
    idPoslanec: integer("id_poslanec").notNull().references(() => poslanec.id),
    vysledek: char("vysledek", { length: 1 }).notNull(),
  },
  (t) => ({
    poslanecIdx: index("hp_poslanec_idx").on(t.idPoslanec),
    hlasovaniIdx: index("hp_hlasovani_idx").on(t.idHlasovani),
    poslanecHlasovaniUq: uniqueIndex("hp_poslanec_hlasovani_uq").on(t.idPoslanec, t.idHlasovani),
  })
);

// ===== Omluvy =====
export const omluva = pgTable(
  "omluva",
  {
    id: integer("id").primaryKey(),
    idPoslanec: integer("id_poslanec").notNull().references(() => poslanec.id),
    od: timestamp("od", { withTimezone: true }).notNull(),
    do: timestamp("do", { withTimezone: true }).notNull(),
    duvod: text("duvod"),
  },
  (t) => ({
    poslanecIdx: index("omluva_poslanec_idx").on(t.idPoslanec),
    intervalIdx: index("omluva_interval_idx").on(t.od, t.do),
  })
);

// ===== Tisky (návrhy zákonů) =====
export const tisk = pgTable(
  "tisk",
  {
    id: integer("id").primaryKey(),
    cislo: integer("cislo").notNull(),
    cisloZa: integer("cislo_za").notNull().default(0),
    idObdobi: integer("id_obdobi").notNull().references(() => volebniObdobi.id),
    idDruh: integer("id_druh"),
    druh: druhTisku("druh"),
    idTypZakon: integer("id_typ_zakon"),
    idTypStavu: integer("id_typ_stavu"),
    nazev: text("nazev").notNull(),
    datumDoruceni: date("datum_doruceni"),
    rozeslano: date("rozeslano"),
    vazby: text("vazby"),
    embedding: vector("embedding"),
  },
  (t) => ({
    obdobiCisloZaUq: uniqueIndex("tisk_obdobi_cislo_za_uq").on(t.idObdobi, t.cislo, t.cisloZa),
    datumIdx: index("tisk_datum_idx").on(t.datumDoruceni),
  })
);

export const tiskHist = pgTable(
  "tisk_hist",
  {
    id: integer("id").primaryKey(),
    idTisk: integer("id_tisk").notNull().references(() => tisk.id, { onDelete: "cascade" }),
    datum: timestamp("datum", { withTimezone: true }),
    idAkce: integer("id_akce"),
    idStav: integer("id_stav"),
    pozn: text("pozn"),
  },
  (t) => ({
    tiskIdx: index("tisk_hist_tisk_idx").on(t.idTisk),
  })
);

export const predkladatel = pgTable(
  "predkladatel",
  {
    id: integer("id").primaryKey(),
    idTisk: integer("id_tisk").notNull().references(() => tisk.id, { onDelete: "cascade" }),
    idOsoba: integer("id_osoba").references(() => osoba.id),
    idOrgan: integer("id_organ").references(() => organ.id),
    typ: text("typ"), // 'osoba' | 'organ'
  },
  (t) => ({
    tiskIdx: index("predkladatel_tisk_idx").on(t.idTisk),
  })
);

// ===== Interpelace =====
export const interpelace = pgTable(
  "interpelace",
  {
    id: integer("id").primaryKey(),
    idObdobi: integer("id_obdobi").notNull().references(() => volebniObdobi.id),
    idOsoba: integer("id_osoba").notNull().references(() => osoba.id),
    idMinister: integer("id_minister").references(() => osoba.id),
    tema: text("tema").notNull(),
    text: text("text"),
    datum: date("datum"),
    stav: text("stav"),
    odpoved: text("odpoved"),
    embedding: vector("embedding"),
  },
  (t) => ({
    osobaIdx: index("interpelace_osoba_idx").on(t.idOsoba),
    obdobiDatumIdx: index("interpelace_obdobi_datum_idx").on(t.idObdobi, t.datum),
  })
);

// ===== Stenoprotokoly (metadata + embedding projevů) =====
export const steno = pgTable(
  "steno",
  {
    id: integer("id").primaryKey(),
    idObdobi: integer("id_obdobi").notNull().references(() => volebniObdobi.id),
    idSchuze: integer("id_schuze").references(() => schuze.id),
    idBod: integer("id_bod").references(() => bodSchuze.id),
    datum: date("datum"),
    casOd: text("cas_od"),
    casDo: text("cas_do"),
  },
  (t) => ({
    schuzeDatumIdx: index("steno_schuze_datum_idx").on(t.idSchuze, t.datum),
  })
);

export const rec = pgTable(
  "rec",
  {
    id: integer("id").primaryKey(),
    idSteno: integer("id_steno").notNull().references(() => steno.id, { onDelete: "cascade" }),
    idOsoba: integer("id_osoba").references(() => osoba.id),
    druh: integer("druh"), // 0–5 (řečník, faktická poznámka, …)
    recText: text("rec_text"),
    embedding: vector("embedding"),
  },
  (t) => ({
    stenoIdx: index("rec_steno_idx").on(t.idSteno),
    osobaIdx: index("rec_osoba_idx").on(t.idOsoba),
  })
);

// ===== Coalition (kurátorované) =====
export const coalition = pgTable(
  "coalition",
  {
    idObdobi: integer("id_obdobi").notNull().references(() => volebniObdobi.id),
    idOrgan: integer("id_organ").notNull().references(() => organ.id),
    role: coalitionRole("role").notNull(),
    platnostOd: date("platnost_od").notNull(),
    platnostDo: date("platnost_do"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idObdobi, t.idOrgan, t.platnostOd] }),
  })
);

// Helpful aliases
export type Osoba = typeof osoba.$inferSelect;
export type Poslanec = typeof poslanec.$inferSelect;
export type Organ = typeof organ.$inferSelect;
export type Hlasovani = typeof hlasovani.$inferSelect;
export type HlasovaniPoslanec = typeof hlasovaniPoslanec.$inferSelect;
export type Tisk = typeof tisk.$inferSelect;
export type Interpelace = typeof interpelace.$inferSelect;
export type Rec = typeof rec.$inferSelect;
export type Steno = typeof steno.$inferSelect;
export type Schuze = typeof schuze.$inferSelect;
export type BodSchuze = typeof bodSchuze.$inferSelect;