// Zählt Seitenaufrufe pro Seite und Tag. Keine IP-Adressen, keine Cookies.
import { heute } from "./_lib.js";

const AUSGENOMMEN = /^\/(api|media|img|css|js|fonts|admin|statistik)\b/;
const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python|headless/i;

export async function onRequest(context) {
  const { request, env, next } = context;
  const res = await next();
  try {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";
    const istSeite = request.method === "GET" && res.status === 200 &&
      (res.headers.get("content-type") || "").includes("text/html");
    if (env.DB && istSeite && !AUSGENOMMEN.test(url.pathname) && !BOT.test(ua)) {
      const seite = url.pathname.replace(/index\.html$/, "") || "/";
      context.waitUntil(
        env.DB.prepare(
          "INSERT INTO seitenaufrufe (seite, tag, anzahl) VALUES (?, ?, 1) " +
          "ON CONFLICT(seite, tag) DO UPDATE SET anzahl = anzahl + 1"
        ).bind(seite, heute()).run()
      );
    }
  } catch (e) { /* Zählen darf die Seite nie blockieren */ }
  return res;
}
