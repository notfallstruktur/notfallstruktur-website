import { accessEmail } from "../_access.js";
import { tabellen } from "../_zaehler.js";
// Statistik-Seite, nur für den Betreiber.
// Schutz: Cloudflare Access auf /statistik einrichten (siehe ANLEITUNG.md).
const landName = (c) => { try { return c && c !== "??" ? new Intl.DisplayNames(["de"], { type: "region" }).of(c) + " (" + c + ")" : "unbekannt"; } catch (e) { return c; } };
const SEITEN = {"/":"Start","/rote-faeden/":"Rote Fäden","/anwendungshilfe/":"xABCDE-Anwendungshilfe","/rsi-checklisten/":"RSI-Checklisten","/wissen/":"Wissen & Ressourcen","/foam/":"FOAM & Fortbildung","/leitlinien/":"Leitlinien & Algorithmen","/apps/":"Apps, Rechner & Nachschlagewerke","/paediatrie/":"Pädiatrische Notfallhilfen","/pocus/":"POCUS","/lebensretter/":"First Responder","/kontakt/":"Über & Kontakt","/nutzung/":"Nutzung & Haftung","/datenschutz/":"Datenschutzerklärung","/feedback/":"Feedback","/selbst-in-not/":"Selbst in Not?"};
const norm = (p) => { p = String(p || "/"); if (!p.endsWith("/")) p += "/"; return p; };
function nurHauptseiten(rows) {
  const m = {};
  for (const r of rows) { const k = norm(r.seite); if (SEITEN[k]) m[k] = (m[k] || 0) + r.n; }
  return m;
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export async function onRequestGet({ request, env }) {
  const nutzer = await accessEmail(request);
  if (!nutzer) {
    return new Response("Kein Zugriff. Diese Seite ist durch Cloudflare Access geschützt.", { status: 403 });
  }
  if (!env.DB) return new Response("Datenbank nicht verbunden.", { status: 503 });

  await tabellen(env.DB);
  const q = (sql) => env.DB.prepare(sql).all().then((r) => r.results);
  const [bes, laender, dlLand] = await Promise.all([
    q("SELECT tag, anzahl FROM besucher_tag ORDER BY tag DESC LIMIT 60"),
    q("SELECT land, SUM(anzahl) n, SUM(CASE WHEN tag >= date('now','-30 day') THEN anzahl ELSE 0 END) n30 FROM seiten_land GROUP BY land ORDER BY n DESC"),
    q("SELECT datei, land, SUM(anzahl) n FROM downloads_land GROUP BY datei, land ORDER BY datei, n DESC")
  ]);
  const besSumme30 = bes.filter((r) => r.tag >= new Date(Date.now() - 30*864e5).toISOString().slice(0,10)).reduce((a, r) => a + r.anzahl, 0);
  const [dl, dl30, seiten, seiten30, fb, msg] = await Promise.all([
    q("SELECT datei, SUM(anzahl) n FROM downloads GROUP BY datei ORDER BY n DESC"),
    q("SELECT datei, SUM(anzahl) n FROM downloads WHERE tag >= date('now','-30 day') GROUP BY datei"),
    q("SELECT seite, SUM(anzahl) n FROM seitenaufrufe GROUP BY seite ORDER BY n DESC"),
    q("SELECT seite, SUM(anzahl) n FROM seitenaufrufe WHERE tag >= date('now','-30 day') GROUP BY seite"),
    q("SELECT id, formular, antworten, erstellt FROM feedback ORDER BY id DESC LIMIT 200"),
    q("SELECT id, name, email, nachricht, erstellt FROM nachrichten ORDER BY id DESC LIMIT 100")
  ]);
  const m30 = (rows, key) => Object.fromEntries(rows.map((r) => [r[key], r.n]));
  const d30 = m30(dl30, "datei");
  const sGes = nurHauptseiten(seiten), s30 = nurHauptseiten(seiten30);
  const seitenListe = Object.keys(SEITEN).map((k) => ({ seite: k, n: sGes[k] || 0 })).sort((a, b) => b.n - a.n);

  const tab = (kopf, zeilen) => `<table><thead><tr>${kopf.map((k) => `<th>${k}</th>`).join("")}</tr></thead><tbody>${zeilen.join("") || `<tr><td colspan="${kopf.length}">Noch keine Daten</td></tr>`}</tbody></table>`;

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Statistik | notfallstruktur.org</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;max-width:1100px;color:#111}h1{font-size:28px}h2{margin-top:36px;border-top:2px solid #C8102E;padding-top:12px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:top}th{background:#f3f3f3}
td.n{text-align:right;font-variant-numeric:tabular-nums}pre{white-space:pre-wrap;margin:0;font-size:12px}a{color:#A3231B}</style></head><body>
<h1>Statistik notfallstruktur.org</h1>
<p>Angemeldet als ${esc(nutzer)}. <a href="/statistik/feedback.csv">Feedback als CSV herunterladen</a></p>
<h2>Verschiedene Besucher pro Tag</h2>
<p>Summe letzte 30 Tage: <b>${besSumme30}</b> (wer an mehreren Tagen kommt, zählt mehrfach; gezählt seit Einführung am 24.10.2026)</p>
${tab(["Tag", "Besucher"], bes.map((r) => `<tr><td>${esc(r.tag)}</td><td class="n">${r.anzahl}</td></tr>`))}
<h2>Seitenaufrufe nach Land</h2>
${tab(["Land", "Gesamt", "Letzte 30 Tage"], laender.map((r) => `<tr><td>${esc(landName(r.land))}</td><td class="n">${r.n}</td><td class="n">${r.n30}</td></tr>`))}
<h2>Downloads nach Land</h2>
${tab(["Datei", "Land", "Gesamt"], dlLand.map((r) => `<tr><td>${esc(r.datei)}</td><td>${esc(landName(r.land))}</td><td class="n">${r.n}</td></tr>`))}
<h2>Downloads</h2>
${tab(["Datei", "Gesamt", "Letzte 30 Tage"], dl.map((r) => `<tr><td>${esc(r.datei)}</td><td class="n">${r.n}</td><td class="n">${d30[r.datei] || 0}</td></tr>`))}
<h2>Seitenaufrufe</h2>
${tab(["Seite", "Gesamt", "Letzte 30 Tage"], seitenListe.map((r) => `<tr><td>${esc(SEITEN[r.seite])}</td><td class="n">${r.n}</td><td class="n">${s30[r.seite] || 0}</td></tr>`))}
<h2>Feedback (${fb.length})</h2>
${tab(["Datum", "Formular", "Antworten"], fb.map((r) => `<tr><td>${esc(r.erstellt)}</td><td>${esc(r.formular)}</td><td><pre>${esc(JSON.stringify(JSON.parse(r.antworten), null, 1))}</pre></td></tr>`))}
<h2>Nachrichten aus dem Kontaktformular</h2>
${tab(["Datum", "Name", "E-Mail", "Nachricht"], msg.map((r) => `<tr><td>${esc(r.erstellt)}</td><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${esc(r.nachricht)}</td></tr>`))}
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
