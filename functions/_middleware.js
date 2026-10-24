// Zählt Seitenaufrufe (pro Seite, Tag und Land) und verschiedene Besucher pro Tag. Keine IP-Adressen, keine Cookies.
import { zaehleSeite, BOT } from "./_zaehler.js";

const AUSGENOMMEN = /^\/(api|media|img|css|js|fonts|admin|statistik)\b/;

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
      context.waitUntil(zaehleSeite(env.DB, request, seite).catch(() => {}));
    }
  } catch (e) { /* Zählen darf die Seite nie blockieren */ }
  return res;
}
