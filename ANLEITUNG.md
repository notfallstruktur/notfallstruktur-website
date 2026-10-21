# notfallstruktur.org – Einrichtung

Statische Website (Eleventy) auf Cloudflare Pages. Inhalte bearbeiten unter `/admin/` (Sveltia CMS).

## 1. Cloudflare Pages
1. Cloudflare Dashboard → Workers & Pages → Erstellen → Pages → Mit Git verbinden → `notfallstruktur/notfallstruktur-website`.
2. Framework: keines. Build-Befehl: `npm run build`. Ausgabeordner: `_site`.
3. Speichern und bereitstellen. Die Seite läuft dann unter `*.pages.dev`.

## 2. Datenbank (Zähler, Feedback, Kontakt)
1. Workers & Pages → D1 → Datenbank erstellen, Name `notfallstruktur`.
2. In der Datenbank → Konsole: Inhalt von `schema.sql` einfügen und ausführen.
3. Pages-Projekt → Einstellungen → Bindungen → D1-Datenbank, Variablenname `DB`. Neu bereitstellen.

## 3. Spam-Schutz (Turnstile)
1. Cloudflare → Turnstile → Widget hinzufügen, Domains `notfallstruktur.org` und `*.pages.dev`.
2. Site Key in `src/_data/site.json` bei `turnstileSiteKey` eintragen.
3. Secret Key: Pages-Projekt → Einstellungen → Variablen → Geheimnis `TURNSTILE_SECRET`.

## 4. Statistik nur für dich
Zero Trust → Access → Anwendungen → Self-hosted: Domain `notfallstruktur.org`, Pfad `statistik`.
Richtlinie: Allow, E-Mail = deine Adresse. Ebenso für die `pages.dev`-Adresse.
Aufruf: `https://notfallstruktur.org/statistik/`.

## 5. Redaktion (Sveltia CMS)
Anmeldung über GitHub braucht einen kleinen Auth-Worker: https://github.com/sveltia/sveltia-cms-auth (Anleitung dort).
Danach die Worker-Adresse in `src/admin/config.yml` bei `base_url` eintragen.

## 6. Domain umziehen (zuletzt)
1. Cloudflare → Website hinzufügen `notfallstruktur.org` (Free). Vorhandene DNS-Einträge, v. a. **MX/E-Mail**, prüfen.
2. Bei alldomains.hosting die Nameserver auf die von Cloudflare ändern.
3. Pages-Projekt → Benutzerdefinierte Domains → `notfallstruktur.org` und `www`.
4. Erst wenn alles läuft: Wix-Abo kündigen.

## Zählung
Seitenaufrufe und PDF-Downloads werden pro Tag gezählt, ohne Cookies und ohne IP-Adressen.
