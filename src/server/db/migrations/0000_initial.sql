-- Placeholder migrace pro Vercel build
-- Skutečné migrace se generují lokálně: `pnpm db:generate`
-- Tento soubor zajistí, že build nevyžaduje DB připojení.

-- Auth.js v5 tabulky
CREATE TABLE IF NOT EXISTS "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  email_verified TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'user',
  notify_by_email BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "account" (
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS "session" (
  session_token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_token" (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Volební období
CREATE TABLE IF NOT EXISTS volebni_obdobi (
  id INTEGER PRIMARY KEY,
  cislo INTEGER NOT NULL,
  nazev TEXT NOT NULL,
  datum_od DATE NOT NULL,
  datum_do DATE,
  aktualni BOOLEAN NOT NULL DEFAULT FALSE
);

-- Osoby
CREATE TABLE IF NOT EXISTS osoba (
  id INTEGER PRIMARY KEY,
  jmeno TEXT NOT NULL,
  prijmeni TEXT NOT NULL,
  titul_pred TEXT,
  titul_za TEXT,
  narozeni DATE,
  pohlavi CHAR(1),
  foto_url TEXT,
  zemrel BOOLEAN NOT NULL DEFAULT FALSE,
  zmena TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS osoba_prijmeni_idx ON osoba(prijmeni);
CREATE INDEX IF NOT EXISTS osoba_jmeno_prijmeni_idx ON osoba(jmeno, prijmeni);

-- Typy orgánů
CREATE TABLE IF NOT EXISTS typ_organu (
  id INTEGER PRIMARY KEY,
  typ TEXT NOT NULL,
  nazev TEXT NOT NULL,
  popis TEXT
);

-- Organy
CREATE TABLE IF NOT EXISTS organ (
  id INTEGER PRIMARY KEY,
  id_typ INTEGER NOT NULL REFERENCES typ_organu(id),
  id_obdobi INTEGER NOT NULL REFERENCES volebni_obdobi(id),
  nazev TEXT NOT NULL,
  zkratka TEXT,
  cl_organ_base INTEGER,
  priorita INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS organ_obdobi_nazev_idx ON organ(id_obdobi, nazev);

-- Funkce
CREATE TABLE IF NOT EXISTS funkce (
  id INTEGER PRIMARY KEY,
  id_organ INTEGER NOT NULL REFERENCES organ(id),
  nazev TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS funkce_organ_nazev_uq ON funkce(id_organ, nazev);

-- Zařazení
CREATE TABLE IF NOT EXISTS zarazeni (
  id INTEGER PRIMARY KEY,
  id_osoba INTEGER NOT NULL REFERENCES osoba(id),
  cl_funkce INTEGER NOT NULL,
  id_of INTEGER NOT NULL,
  od_o DATE,
  do_o DATE,
  od_f DATE,
  do_f DATE
);
CREATE INDEX IF NOT EXISTS zarazeni_osoba_idx ON zarazeni(id_osoba);
CREATE INDEX IF NOT EXISTS zarazeni_organ_id_idx ON zarazeni(id_of);

-- Poslanec
CREATE TABLE IF NOT EXISTS poslanec (
  id INTEGER PRIMARY KEY,
  id_osoba INTEGER NOT NULL REFERENCES osoba(id),
  id_obdobi INTEGER NOT NULL REFERENCES volebni_obdobi(id),
  id_kandidatka INTEGER REFERENCES organ(id),
  region TEXT,
  web TEXT,
  email TEXT,
  telefon TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS poslanec_obdobi_osoba_uq ON poslanec(id_obdobi, id_osoba);

-- Schůze
CREATE TABLE IF NOT EXISTS schuze (
  id INTEGER PRIMARY KEY,
  id_obdobi INTEGER NOT NULL REFERENCES volebni_obdobi(id),
  cislo INTEGER NOT NULL,
  nazev TEXT,
  datum_od DATE,
  datum_do DATE,
  stav TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS schuze_obdobi_cislo_uq ON schuze(id_obdobi, cislo);

-- Bod schůze
CREATE TABLE IF NOT EXISTS bod_schuze (
  id INTEGER PRIMARY KEY,
  id_schuze INTEGER NOT NULL REFERENCES schuze(id),
  poradi INTEGER NOT NULL,
  id_tisk INTEGER,
  nazev TEXT,
  typ_bodu TEXT,
  stav TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS bod_schuze_schuze_poradi_uq ON bod_schuze(id_schuze, poradi);

-- Hlasování
CREATE TABLE IF NOT EXISTS hlasovani (
  id INTEGER PRIMARY KEY,
  id_obdobi INTEGER NOT NULL REFERENCES volebni_obdobi(id),
  id_schuze INTEGER REFERENCES schuze(id),
  id_bod INTEGER REFERENCES bod_schuze(id),
  datum TIMESTAMPTZ,
  cas TEXT,
  druh_hlasovani CHAR(1),
  vysledek CHAR(1),
  pro INTEGER,
  proti INTEGER,
  zdrzel INTEGER,
  prihlaseno INTEGER,
  kvorum INTEGER,
  nazev TEXT NOT NULL,
  popis TEXT,
  id_tisk INTEGER,
  embedding vector(1024)
);
CREATE INDEX IF NOT EXISTS hlasovani_datum_idx ON hlasovani(datum);
CREATE INDEX IF NOT EXISTS hlasovani_obdobi_idx ON hlasovani(id_obdobi);
CREATE INDEX IF NOT EXISTS hlasovani_schuze_idx ON hlasovani(id_schuze);

-- Hlasování poslanec
CREATE TABLE IF NOT EXISTS hlasovani_poslanec (
  id SERIAL PRIMARY KEY,
  id_hlasovani INTEGER NOT NULL REFERENCES hlasovani(id) ON DELETE CASCADE,
  id_poslanec INTEGER NOT NULL REFERENCES poslanec(id),
  vysledek CHAR(1) NOT NULL
);
CREATE INDEX IF NOT EXISTS hp_poslanec_idx ON hlasovani_poslanec(id_poslanec);
CREATE INDEX IF NOT EXISTS hp_hlasovani_idx ON hlasovani_poslanec(id_hlasovani);
CREATE UNIQUE INDEX IF NOT EXISTS hp_poslanec_hlasovani_uq ON hlasovani_poslanec(id_poslanec, id_hlasovani);

-- Omluvy
CREATE TABLE IF NOT EXISTS omluva (
  id SERIAL PRIMARY KEY,
  id_poslanec INTEGER NOT NULL REFERENCES poslanec(id),
  od TIMESTAMPTZ NOT NULL,
  do TIMESTAMPTZ NOT NULL,
  duvod TEXT
);
CREATE INDEX IF NOT EXISTS omluva_poslanec_idx ON omluva(id_poslanec);

-- Tisky
CREATE TABLE IF NOT EXISTS tisk (
  id INTEGER PRIMARY KEY,
  cislo INTEGER NOT NULL,
  cislo_za INTEGER NOT NULL DEFAULT 0,
  id_obdobi INTEGER NOT NULL REFERENCES volebni_obdobi(id),
  id_druh INTEGER,
  druh TEXT,
  id_typ_zakon INTEGER,
  id_typ_stavu INTEGER,
  nazev TEXT NOT NULL,
  datum_doruceni DATE,
  rozeslano DATE,
  vazby TEXT,
  embedding vector(1024)
);
CREATE UNIQUE INDEX IF NOT EXISTS tisk_obdobi_cislo_za_uq ON tisk(id_obdobi, cislo, cislo_za);
CREATE INDEX IF NOT EXISTS tisk_datum_idx ON tisk(datum_doruceni);

-- Tisk hist
CREATE TABLE IF NOT EXISTS tisk_hist (
  id INTEGER PRIMARY KEY,
  id_tisk INTEGER NOT NULL REFERENCES tisk(id) ON DELETE CASCADE,
  datum TIMESTAMPTZ,
  id_akce INTEGER,
  id_stav INTEGER,
  pozn TEXT
);
CREATE INDEX IF NOT EXISTS tisk_hist_tisk_idx ON tisk_hist(id_tisk);

-- Předkladatel
CREATE TABLE IF NOT EXISTS predkladatel (
  id INTEGER PRIMARY KEY,
  id_tisk INTEGER NOT NULL REFERENCES tisk(id) ON DELETE CASCADE,
  id_osoba INTEGER REFERENCES osoba(id),
  id_organ INTEGER REFERENCES organ(id),
  typ TEXT
);
CREATE INDEX IF NOT EXISTS predkladatel_tisk_idx ON predkladatel(id_tisk);

-- Interpelace
CREATE TABLE IF NOT EXISTS interpelace (
  id INTEGER PRIMARY KEY,
  id_obdobi INTEGER NOT NULL REFERENCES volebni_obdobi(id),
  id_osoba INTEGER NOT NULL REFERENCES osoba(id),
  id_minister INTEGER REFERENCES osoba(id),
  tema TEXT NOT NULL,
  text TEXT,
  datum DATE,
  stav TEXT,
  odpoved TEXT,
  embedding vector(1024)
);
CREATE INDEX IF NOT EXISTS interpelace_osoba_idx ON interpelace(id_osoba);
CREATE INDEX IF NOT EXISTS interpelace_obdobi_datum_idx ON interpelace(id_obdobi, datum);

-- Steno
CREATE TABLE IF NOT EXISTS steno (
  id INTEGER PRIMARY KEY,
  id_obdobi INTEGER NOT NULL REFERENCES volebni_obdobi(id),
  id_schuze INTEGER REFERENCES schuze(id),
  id_bod INTEGER REFERENCES bod_schuze(id),
  datum DATE,
  cas_od TEXT,
  cas_do TEXT
);
CREATE INDEX IF NOT EXISTS steno_schuze_datum_idx ON steno(id_schuze, datum);

-- Rec
CREATE TABLE IF NOT EXISTS rec (
  id INTEGER PRIMARY KEY,
  id_steno INTEGER NOT NULL REFERENCES steno(id) ON DELETE CASCADE,
  id_osoba INTEGER REFERENCES osoba(id),
  druh INTEGER,
  rec_text TEXT,
  embedding vector(1024)
);
CREATE INDEX IF NOT EXISTS rec_steno_idx ON rec(id_steno);
CREATE INDEX IF NOT EXISTS rec_osoba_idx ON rec(id_osoba);

-- Coalition
CREATE TABLE IF NOT EXISTS coalition (
  id_obdobi INTEGER NOT NULL REFERENCES volebni_obdobi(id),
  id_organ INTEGER NOT NULL REFERENCES organ(id),
  role TEXT NOT NULL,
  platnost_od DATE NOT NULL,
  platnost_do DATE,
  PRIMARY KEY (id_obdobi, id_organ, platnost_od)
);

-- Participace
CREATE TABLE IF NOT EXISTS petice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  cilovy_poslanec_id INTEGER REFERENCES poslanec(id),
  cilovy_tisk_id INTEGER REFERENCES tisk(id),
  cilovy_pocet INTEGER NOT NULL DEFAULT 1000,
  datum_od TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  datum_do TIMESTAMPTZ,
  stav TEXT NOT NULL DEFAULT 'DRAFT',
  created_by_id UUID REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_petice UUID NOT NULL REFERENCES petice(id) ON DELETE CASCADE,
  id_user UUID REFERENCES "user"(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  jmeno TEXT,
  email TEXT,
  comment_md TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anketa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  otazka TEXT NOT NULL,
  options JSONB NOT NULL,
  multi BOOLEAN NOT NULL DEFAULT FALSE,
  anonymni BOOLEAN NOT NULL DEFAULT TRUE,
  datum_od TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  datum_do TIMESTAMPTZ,
  stav TEXT NOT NULL DEFAULT 'DRAFT'
);

CREATE TABLE IF NOT EXISTS anketa_volba (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_anketa UUID NOT NULL REFERENCES anketa(id) ON DELETE CASCADE,
  id_user UUID REFERENCES "user"(id),
  hlas JSONB NOT NULL,
  ip_hash TEXT,
  hlas_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS komentar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  body_md TEXT NOT NULL,
  parent_id UUID,
  reactions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sledovane (
  id_user UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '{"email":true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_user, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS notifikace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  typ TEXT NOT NULL,
  ref JSONB NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW indexy (drizzle-kit neumí)
CREATE INDEX IF NOT EXISTS hlasovani_embedding_hnsw_idx ON hlasovani USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS tisk_embedding_hnsw_idx ON tisk USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS rec_embedding_hnsw_idx ON rec USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS interpelace_embedding_hnsw_idx ON interpelace USING hnsw (embedding vector_cosine_ops);