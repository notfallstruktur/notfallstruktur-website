// Zählt einen verschiedenen Besucher pro Tag, aber nur, wenn die Seite im Browser
// tatsächlich bedient wurde (Scrollen, Tippen, Zeigen). Keine Cookies, keine IP-Speicherung.
import { zaehleBesucher, istBot } from "../_zaehler.js";

export async function onRequestPost({ request, env, waitUntil }) {
  if (env.DB && !istBot(request) && request.headers.get("sec-fetch-site") !== "cross-site") {
    try { await zaehleBesucher(env.DB, request); } catch (e) { /* ignorieren */ }
  }
  return new Response(null, { status: 204 });
}
