-- Datenbank für notfallstruktur.org (Cloudflare D1)
-- Es werden keine IP-Adressen und keine Cookies gespeichert.

CREATE TABLE IF NOT EXISTS downloads (
  datei  TEXT NOT NULL,
  tag    TEXT NOT NULL,          -- JJJJ-MM-TT
  anzahl INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (datei, tag)
);

CREATE TABLE IF NOT EXISTS seitenaufrufe (
  seite  TEXT NOT NULL,
  tag    TEXT NOT NULL,
  anzahl INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (seite, tag)
);

CREATE TABLE IF NOT EXISTS feedback (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  formular  TEXT NOT NULL,
  antworten TEXT NOT NULL,       -- JSON
  erstellt  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nachrichten (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT,
  email     TEXT NOT NULL,
  nachricht TEXT NOT NULL,
  erstellt  TEXT NOT NULL DEFAULT (datetime('now'))
);
