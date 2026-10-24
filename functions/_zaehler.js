// Gemeinsame Zählfunktionen. Keine IP-Adressen, keine Cookies, keine Profile.
import { heute } from "./_lib.js";

export const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python|headless/i;

let tabellenOk = false;
async function tabellen(db) {
  if (tabellenOk) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS seiten_land (seite TEXT NOT NULL, tag TEXT NOT NULL, land TEXT NOT NULL, anzahl INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (seite, tag, land))"),
    db.prepare("CREATE TABLE IF NOT EXISTS downloads_land (datei TEXT NOT NULL, tag TEXT NOT NULL, land TEXT NOT NULL, anzahl INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (datei, tag, land))"),
    db.prepare("CREATE TABLE IF NOT EXISTS besucher_tag (tag TEXT PRIMARY KEY, anzahl INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE TABLE IF NOT EXISTS besucher_kennung (tag TEXT NOT NULL, kennung TEXT NOT NULL, PRIMARY KEY (tag, kennung))"),
    db.prepare("CREATE TABLE IF NOT EXISTS tagessalz (tag TEXT PRIMARY KEY, wert TEXT NOT NULL)")
  ]);
  tabellenOk = true;
}

function land(request) {
  return (request.cf && request.cf.country) || "??";
}

// Täglich wechselnder Zufallswert; alte Werte werden gelöscht und sind danach unwiederbringlich.
async function salz(db, tag) {
  let r = await db.prepare("SELECT wert FROM tagessalz WHERE tag = ?").bind(tag).first();
  if (r) return r.wert;
  const zufall = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  await db.prepare("INSERT OR IGNORE INTO tagessalz (tag, wert) VALUES (?, ?)").bind(tag, zufall).run();
  await db.prepare("DELETE FROM tagessalz WHERE tag < ?").bind(tag).run();
  await db.prepare("DELETE FROM besucher_kennung WHERE tag < ?").bind(tag).run();
  r = await db.prepare("SELECT wert FROM tagessalz WHERE tag = ?").bind(tag).first();
  return r.wert;
}

async function besucher(db, request, tag) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ua = request.headers.get("user-agent") || "";
  const s = await salz(db, tag);
  const roh = new TextEncoder().encode(s + "|" + ip + "|" + ua);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", roh));
  const kennung = [...h.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const r = await db.prepare("INSERT OR IGNORE INTO besucher_kennung (tag, kennung) VALUES (?, ?)").bind(tag, kennung).run();
  if (r.meta && r.meta.changes > 0) {
    await db.prepare("INSERT INTO besucher_tag (tag, anzahl) VALUES (?, 1) ON CONFLICT(tag) DO UPDATE SET anzahl = anzahl + 1").bind(tag).run();
  }
}

export async function zaehleSeite(db, request, seite) {
  const tag = heute();
  await tabellen(db);
  await db.batch([
    db.prepare("INSERT INTO seitenaufrufe (seite, tag, anzahl) VALUES (?, ?, 1) ON CONFLICT(seite, tag) DO UPDATE SET anzahl = anzahl + 1").bind(seite, tag),
    db.prepare("INSERT INTO seiten_land (seite, tag, land, anzahl) VALUES (?, ?, ?, 1) ON CONFLICT(seite, tag, land) DO UPDATE SET anzahl = anzahl + 1").bind(seite, tag, land(request))
  ]);
  await besucher(db, request, tag);
}

export async function zaehleDownload(db, request, datei) {
  const tag = heute();
  await tabellen(db);
  await db.batch([
    db.prepare("INSERT INTO downloads (datei, tag, anzahl) VALUES (?, ?, 1) ON CONFLICT(datei, tag) DO UPDATE SET anzahl = anzahl + 1").bind(datei, tag),
    db.prepare("INSERT INTO downloads_land (datei, tag, land, anzahl) VALUES (?, ?, ?, 1) ON CONFLICT(datei, tag, land) DO UPDATE SET anzahl = anzahl + 1").bind(datei, tag, land(request))
  ]);
}

export { tabellen };
