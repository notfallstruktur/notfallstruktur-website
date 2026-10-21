// Kontaktformular mit Spam-Schutz (Cloudflare Turnstile).
import { json, leseJSON } from "../_lib.js";

async function turnstileOk(token, secret, ip) {
  if (!secret) return true; // solange kein Schlüssel hinterlegt ist
  if (!token) return false;
  const fd = new FormData();
  fd.append("secret", secret);
  fd.append("response", token);
  if (ip) fd.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd });
  const j = await r.json();
  return !!j.success;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, fehler: "Datenbank nicht verbunden" }, 503);
  let d;
  try { d = await leseJSON(request, 10000); } catch { return json({ ok: false }, 400); }
  const email = String(d.email || "").trim();
  const nachricht = String(d.message || "").trim();
  const name = String(d.name || "").trim().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !nachricht) return json({ ok: false }, 400);
  if (!(await turnstileOk(d.turnstile, env.TURNSTILE_SECRET, request.headers.get("cf-connecting-ip")))) {
    return json({ ok: false, fehler: "Spam-Schutz" }, 403);
  }
  await env.DB.prepare("INSERT INTO nachrichten (name, email, nachricht) VALUES (?, ?, ?)")
    .bind(name, email.slice(0, 200), nachricht.slice(0, 5000)).run();
  return json({ ok: true });
}
