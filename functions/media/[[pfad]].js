// Download-Zähler: zählt jeden Abruf einer PDF-Datei pro Datei und Tag.
// Keine IP-Adressen, keine Cookies.
import { zaehleDownload, BOT } from "../_zaehler.js";


export async function onRequestGet(context) {
  const { request, env, next } = context;
  const res = await next();
  try {
    const url = new URL(request.url);
    const datei = decodeURIComponent(url.pathname.replace(/^\/media\//, ""));
    const v = url.searchParams.get("v") || "";
    const dateiMitVersion = /^\d{2}\.\d{2}\.\d{4}$/.test(v) ? datei + " · Version " + v : datei;
    const ua = request.headers.get("user-agent") || "";
    const teilabruf = request.headers.get("range") && !/^bytes=0-/.test(request.headers.get("range"));
    if (env.DB && res.ok && /\.pdf$/i.test(datei) && !BOT.test(ua) && !teilabruf) {
      context.waitUntil(zaehleDownload(env.DB, request, dateiMitVersion).catch(() => {}));
    }
  } catch (e) { /* Download nie blockieren */ }
  return res;
}
