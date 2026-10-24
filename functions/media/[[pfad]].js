// Download-Zähler: zählt jeden Abruf einer PDF-Datei pro Datei und Tag.
// Keine IP-Adressen, keine Cookies.
import { zaehleDownload, BOT } from "../_zaehler.js";


export async function onRequestGet(context) {
  const { request, env, next } = context;
  const res = await next();
  try {
    const url = new URL(request.url);
    const datei = decodeURIComponent(url.pathname.replace(/^\/media\//, ""));
    const ua = request.headers.get("user-agent") || "";
    const teilabruf = request.headers.get("range") && !/^bytes=0-/.test(request.headers.get("range"));
    if (env.DB && res.ok && /\.pdf$/i.test(datei) && !BOT.test(ua) && !teilabruf) {
      context.waitUntil(zaehleDownload(env.DB, request, datei).catch(() => {}));
    }
  } catch (e) { /* Download nie blockieren */ }
  return res;
}
