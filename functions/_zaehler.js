// Gemeinsame Zählfunktionen. Keine IP-Adressen, keine Cookies, keine Profile.
import { heute } from "./_lib.js";

export const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python|headless|scrap|fetch|http[-_ ]?client|httpclient|axios|node|java\/|go-http|libwww|okhttp|lighthouse|pingdom|uptime|facebookexternalhit|whatsapp|telegram|discord|slack|embedly|validator|scan|archive|feed|reader|search|ahrefs|semrush|mj12|bytespider|gpt|claude|perplexity|yandex|baidu|phantom|selenium|puppeteer|playwright|electron/i;

// Rechenzentren und Cloud-Anbieter: von dort kommen praktisch keine Menschen.
const RECHENZENTRUM = /amazon|aws|google llc|google cloud|microsoft|azure|digitalocean|hetzner|ovh|linode|vultr|oracle|alibaba|tencent|leaseweb|contabo|scaleway|choopa|m247|datacamp|ionos|netcup|upcloud|rackspace|ibm cloud|hostinger|godaddy|psychz|colocrossing|quadranet/i;

// Heuristik ohne Cookies: echte Browser senden Sprache und (meist) Sec-Fetch-Header.
export function istBot(request) {
  const h = request.headers;
  const ua = h.get("user-agent") || "";
  if (!ua || ua.length < 20 || BOT.test(ua)) return true;
  if (!h.get("accept-language")) return true;
  const modus = h.get("sec-fetch-mode");
  if (modus && modus !== "navigate" && modus !== "cors" && modus !== "no-cors") return true;
  const ziel = h.get("sec-fetch-dest");
  if (ziel && ziel !== "document" && ziel !== "empty") return true;
  const zweck = (h.get("sec-purpose") || h.get("purpose") || "").toLowerCase();
  if (zweck.includes("prefetch") || zweck.includes("prerender")) return true;
  const asn = (request.cf && request.cf.asOrganization) || "";
  if (asn && RECHENZENTRUM.test(asn)) return true;
  return false;
}

let tabellenOk = false;
async function tabellen(db) {
  if (tabellenOk) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS seiten_land (seite TEXT NOT NULL, tag TEXT NOT NULL, land TEXT NOT NULL, anzahl INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (seite, tag, land))"),
    db.prepare("CREATE TABLE IF NOT EXISTS downloads_land (datei TEXT NOT NULL, tag TEXT NOT NULL, land TEXT NOT NULL, anzahl INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (datei, tag, land))"),
    db.prepare("CREATE TABLE IF NOT EXISTS besucher_tag (tag TEXT PRIMARY KEY, anzahl INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE TABLE IF NOT EXISTS besucher_kennung (tag TEXT NOT NULL, kennung TEXT NOT NULL, PRIMARY KEY (tag, kennung))"),
    db.prepare("CREATE TABLE IF NOT EXISTS herkunft (quelle TEXT NOT NULL, tag TEXT NOT NULL, anzahl INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (quelle, tag))"),
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

export async function zaehleBesucher(db, request) {
  const tag = heute();
  await tabellen(db);
  await besucher(db, request, tag);
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
  await db.prepare("INSERT INTO seitenaufrufe (seite, tag, anzahl) VALUES (?, ?, 1) ON CONFLICT(seite, tag) DO UPDATE SET anzahl = anzahl + 1").bind(seite, tag).run();
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

// Einstiege: woher kommt der Aufruf? Nur Domain (ohne Pfad und Suchbegriffe) oder ?quelle=Name. Keine Personendaten.
const EIGENE = /(^|\.)(notfallstruktur\.(org|de)|pages\.dev)$/;
export async function zaehleHerkunft(db, request, url) {
  let quelle = "";
  const q = (url.searchParams.get("quelle") || "").toLowerCase();
  if (/^[a-z0-9_-]{1,30}$/.test(q)) quelle = "Link: " + q;
  else {
    const ref = request.headers.get("referer") || "";
    if (!ref) quelle = "direkt / unbekannt";
    else {
      let host = "";
      try { host = new URL(ref).hostname.toLowerCase().replace(/^www\./, "").slice(0, 80); } catch { return; }
      if (!host || EIGENE.test(host)) return; // interne Navigation zählt nicht
      quelle = host;
    }
  }
  const tag = heute();
  await tabellen(db);
  await db.prepare("INSERT INTO herkunft (quelle, tag, anzahl) VALUES (?, ?, 1) ON CONFLICT(quelle, tag) DO UPDATE SET anzahl = anzahl + 1").bind(quelle, tag).run();
}
