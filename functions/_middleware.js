// Zählt Seitenaufrufe (pro Seite, Tag und Land). Besucher werden getrennt über /api/besuch gezählt. Keine IP-Adressen, keine Cookies.
import { zaehleSeite, zaehleHerkunft, istBot } from "./_zaehler.js";

const AUSGENOMMEN = /^\/(api|media|img|css|js|fonts|admin|statistik)\b/;

export async function onRequest(context) {
  const { request, env, next } = context;
  const res = await next();
  try {
    const url = new URL(request.url);
    const istSeite = request.method === "GET" && res.status === 200 &&
      (res.headers.get("content-type") || "").includes("text/html");
    if (env.DB && istSeite && !AUSGENOMMEN.test(url.pathname) && !istBot(request)) {
      const seite = url.pathname.replace(/index\.html$/, "") || "/";
      context.waitUntil(zaehleSeite(env.DB, request, seite).catch(() => {}));
      context.waitUntil(zaehleHerkunft(env.DB, request, url).catch(() => {}));
    }
  } catch (e) { /* Zählen darf die Seite nie blockieren */ }
  return res;
}
