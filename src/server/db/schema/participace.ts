// Participační / app-specific tabulky (petice, ankety, komentáře, sledování)

import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  pgEnum,
  boolean,
  jsonb,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { hlasovani, tisk, poslanec } from "./psp";

export const peticeStav = pgEnum("petice_stav", ["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]);
export const anketaStav = pgEnum("anketa_stav", ["DRAFT", "ACTIVE", "CLOSED"]);
export const targetType = pgEnum("target_type", [
  "HLASOVANI",
  "TISK",
  "POSLANEC",
  "KLUB",
  "REC",
  "PETICE",
]);

export const petice = pgTable(
  "petice",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull(),
    cilovyPoslanecId: integer("cilovy_poslanec_id").references(() => poslanec.id),
    cilovyTiskId: integer("cilovy_tisk_id").references(() => tisk.id),
    cilovyPocet: integer("cilovy_pocet").notNull().default(1000),
    datumOd: timestamp("datum_od", { withTimezone: true }).notNull().defaultNow(),
    datumDo: timestamp("datum_do", { withTimezone: true }),
    stav: peticeStav("stav").notNull().default("DRAFT"),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stavIdx: index("petice_stav_idx").on(t.stav),
  })
);

export const podpis = pgTable(
  "podpis",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idPetice: uuid("id_petice").notNull().references(() => petice.id, { onDelete: "cascade" }),
    idUser: uuid("id_user").references(() => users.id, { onDelete: "set null" }),
    anonymousId: text("anonymous_id"), // pro ne-auth podpisy (cookie)
    jmeno: text("jmeno"),
    email: text("email"),
    commentMd: text("comment_md"),
    verified: boolean("verified").notNull().default(false),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    peticeIdx: index("podpis_petice_idx").on(t.idPetice),
    peticeUserUq: uniqueIndex("podpis_petice_user_uq").on(t.idPetice, t.idUser),
    peticeAnonUq: uniqueIndex("podpis_petice_anon_uq").on(t.idPetice, t.anonymousId),
  })
);

export const anketa = pgTable(
  "anketa",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    otazka: text("otazka").notNull(),
    options: jsonb("options").notNull().$type<{ id: string; label: string }[]>(),
    multi: boolean("multi").notNull().default(false),
    anonymni: boolean("anonymni").notNull().default(true),
    datumOd: timestamp("datum_od", { withTimezone: true }).notNull().defaultNow(),
    datumDo: timestamp("datum_do", { withTimezone: true }),
    stav: anketaStav("stav").notNull().default("DRAFT"),
  },
  (t) => ({
    stavIdx: index("anketa_stav_idx").on(t.stav),
  })
);

export const anketaVolba = pgTable(
  "anketa_volba",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idAnketa: uuid("id_anketa").notNull().references(() => anketa.id, { onDelete: "cascade" }),
    idUser: uuid("id_user").references(() => users.id),
    hlas: jsonb("hlas").notNull().$type<string[]>(),
    ipHash: text("ip_hash"),
    hlasAt: timestamp("hlas_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    anketaIdx: index("anketa_volba_anketa_idx").on(t.idAnketa),
  })
);

export const komentar = pgTable(
  "komentar",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idUser: uuid("id_user").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: targetType("target_type").notNull(),
    targetId: text("target_id").notNull(), // polymorphic — ID as string
    bodyMd: text("body_md").notNull(),
    parentId: uuid("parent_id"),
    reactions: jsonb("reactions").notNull().default({}).$type<Record<string, string[]>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => ({
    targetIdx: index("komentar_target_idx").on(t.targetType, t.targetId),
    parentIdx: index("komentar_parent_idx").on(t.parentId),
  })
);

export const sledovane = pgTable(
  "sledovane",
  {
    idUser: uuid("id_user").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: targetType("target_type").notNull(),
    targetId: text("target_id").notNull(),
    channels: jsonb("channels").notNull().default({ email: true }).$type<{ email?: boolean; web?: boolean }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.idUser, t.targetType, t.targetId] }),
  })
);

export const notifikace = pgTable(
  "notifikace",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idUser: uuid("id_user").notNull().references(() => users.id, { onDelete: "cascade" }),
    typ: text("typ").notNull(), // 'PETICE_MILESTONE' | 'COMMENT_REPLY' | 'VOTE_ALERT' | 'WATCH_NEW_VOTE' | ...
    ref: jsonb("ref").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notifikace_user_idx").on(t.idUser),
    unreadIdx: index("notifikace_unread_idx").on(t.idUser, t.readAt),
  })
);

export type Petice = typeof petice.$inferSelect;
export type Podpis = typeof podpis.$inferSelect;
export type Anketa = typeof anketa.$inferSelect;
export type AnketaVolba = typeof anketaVolba.$inferSelect;
export type Komentar = typeof komentar.$inferSelect;
export type Sledovane = typeof sledovane.$inferSelect;
export type Notifikace = typeof notifikace.$inferSelect;