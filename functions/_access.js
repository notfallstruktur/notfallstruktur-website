// Prüft das Cloudflare-Access-Token (JWT) und gibt die E-Mail zurück, sonst null.
const TEAM = "https://misty-bush-9f21.cloudflareaccess.com";
const ERLAUBT = ["h.koller@posteo.de"];

function b64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function accessEmail(request) {
  let token = request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    token = m && m[1];
  }
  if (!token) return null;
  try {
    const [h, p, sig] = token.split(".");
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
    if (payload.iss !== TEAM) return null;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    const certs = await fetch(TEAM + "/cdn-cgi/access/certs", { cf: { cacheTtl: 3600 } }).then((r) => r.json());
    const jwk = (certs.keys || []).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(sig), new TextEncoder().encode(h + "." + p));
    if (!ok) return null;
    const email = String(payload.email || "").toLowerCase();
    return ERLAUBT.includes(email) ? email : null;
  } catch (e) {
    return null;
  }
}
