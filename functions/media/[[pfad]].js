// Download-Zähler: zählt jeden Abruf einer PDF-Datei pro Datei und Tag.
// Keine IP-Adressen, keine Cookies.
import { heute } from "../_lib.js";

const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python|headless/i;

export async function onRequestGet(context) {
  const { request, env, next } = context;
  const res = await next();
  try {
    const url = new URL(request.url);
    const datei = decodeURIComponent(url.pathname.replace(/^\/media\//, ""));
    const ua = request.headers.get("user-agent") || "";
    const teilabruf = request.headers.get("range") && !/^bytes=0-/.test(request.headers.get("range"));
    if (env.DB && res.ok && /\.pdf$/i.test(datei) && !BOT.test(ua) && !teilabruf) {
      context.waitUntil(
        env.DB.prepare(
          "INSERT INTO downloads (datei, tag, anzahl) VALUES (?, ?, 1) " +
          "ON CONFLICT(datei, tag) DO UPDATE SET anzahl = anzahl + 1"
        ).bind(datei, heute()).run()
      );
    }
  } catch (e) { /* Download nie blockieren */ }
  return res;
}
