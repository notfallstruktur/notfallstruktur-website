// Feedback als CSV (nur mit Cloudflare Access).
export async function onRequestGet({ request, env }) {
  if (!request.headers.get("cf-access-authenticated-user-email")) return new Response("Kein Zugriff.", { status: 403 });
  if (!env.DB) return new Response("Datenbank nicht verbunden.", { status: 503 });
  const rows = (await env.DB.prepare("SELECT id, formular, antworten, erstellt FROM feedback ORDER BY id").all()).results;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(JSON.parse(r.antworten))))];
  const cell = (v) => `"${String(Array.isArray(v) ? v.join("; ") : v ?? "").replace(/"/g, '""')}"`;
  const lines = [["id", "formular", "erstellt", ...keys].map(cell).join(";")];
  for (const r of rows) {
    const a = JSON.parse(r.antworten);
    lines.push([r.id, r.formular, r.erstellt, ...keys.map((k) => a[k])].map(cell).join(";"));
  }
  return new Response("﻿" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="feedback.csv"' }
  });
}
