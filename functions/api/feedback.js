// Speichert anonymes Feedback (Rote Fäden / RSI-Checklisten).
import { json, leseJSON } from "../_lib.js";

const FORMULARE = ["allgemein", "rote-faeden", "rsi"];

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, fehler: "Datenbank nicht verbunden" }, 503);
  let daten;
  try { daten = await leseJSON(request); } catch { return json({ ok: false }, 400); }
  if (!FORMULARE.includes(daten.formular) || typeof daten.antworten !== "object") return json({ ok: false }, 400);
  await env.DB.prepare("INSERT INTO feedback (formular, antworten) VALUES (?, ?)")
    .bind(daten.formular, JSON.stringify(daten.antworten)).run();
  return json({ ok: true });
}
