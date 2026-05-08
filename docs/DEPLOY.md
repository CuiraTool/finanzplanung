# Deployment auf Vercel

## Erstes Deployment (~ 15 Minuten)

### 1. Vercel-Account anlegen

1. Gehe auf [vercel.com](https://vercel.com)
2. **Sign Up** → wähle "Continue with GitHub" (verknüpft direkt mit deinem GitHub-Account `rise4best`)
3. Auf der Pricing-Seite: **Hobby (Free)** auswählen — reicht für Etappe 1–3 vollständig

### 2. Projekt importieren

1. Im Vercel-Dashboard auf **Add New… → Project**
2. **Install GitHub App** falls Vercel deine Repos noch nicht sieht
   - "Only select repositories" wählen → `CuiraTool/finanzplanung` markieren
   - Authorize
3. Zurück im Dashboard: `CuiraTool/finanzplanung` erscheint in der Liste, **Import** klicken
4. Im Konfigurations-Screen:
   - **Framework Preset:** Next.js (sollte automatisch erkannt sein)
   - **Build Command:** leer lassen (Default `next build`)
   - **Output Directory:** leer lassen (Default `.next`)
   - **Install Command:** `pnpm install --frozen-lockfile`
   - **Root Directory:** `.` (Default)
5. **Deploy** klicken

Das erste Deployment dauert ~ 2–3 Minuten. Vercel liefert dir am Ende eine URL wie `finanzplanung-xyz.vercel.app`.

### 3. Auto-Deploy bei jedem Push

Ist automatisch konfiguriert: jeder neue Commit auf `main` triggert automatisch ein neues Deployment. Pull Requests bekommen Preview-URLs.

## Custom Domain `plan.cuirapartners.ch`

Wenn du das Tool unter eurer eigenen Subdomain laufen lassen willst:

### 1. In Vercel

1. Projekt-Einstellungen → **Domains**
2. `plan.cuirapartners.ch` eingeben → **Add**
3. Vercel zeigt dir DNS-Records, die du beim Domain-Anbieter (vermutlich euer Hosting für `cuirapartners.ch`) eintragen musst:
   - Typ: `CNAME`
   - Name: `plan`
   - Wert: `cname.vercel-dns.com`

### 2. Beim Domain-Provider

Im DNS-Bereich der `cuirapartners.ch` den CNAME-Eintrag setzen. Propagierung dauert 5 Minuten bis 24 Stunden, meistens unter einer Stunde.

### 3. Vercel verifiziert automatisch

Sobald DNS resolved, schaltet Vercel SSL/HTTPS frei (Let's Encrypt). Ab dann ist die App unter `https://plan.cuirapartners.ch` erreichbar.

## Wichtige Hinweise

**Datenschutz / DSG:**
Bisher speichert das Tool **alle Daten nur im Browser des Users** (LocalStorage). Es geht nichts an einen Server. Damit ist Vercel-Hosting heute unbedenklich — die App ist eine reine Client-Side-App.

**Achtung ab Etappe 4:** Sobald wir Supabase einbauen (Auth + Backend), müssen die Daten in einer EU-Region liegen (Supabase Frankfurt). Vercel selbst kann dann auf Frankfurt-Edge konfiguriert werden, aber die DSG-relevante Datenhaltung ist Supabase, nicht Vercel.

**Free-Tier-Grenzen:**
- 100 GB Bandwidth/Monat → reicht für >100k Page Views
- 6'000 Build-Minuten/Monat → mehr als genug
- Auto-Deployment, Preview-URLs, SSL inklusive

**Wenn die URL nicht öffentlich sein soll:**
Vercel Pro ($20/Monat) hat **Password Protection** — du kannst die Preview-Deployments hinter einem Passwort verstecken, ohne Auth in der App zu bauen. Sinnvoll, wenn du Tiago oder Test-Personen einen Link gibst, ohne dass die URL geleakt sein darf.

## Troubleshooting

**Build schlägt fehl: "Cannot find module"**
→ Lokal `pnpm install` einmal frisch durchziehen, lockfile committen, neu pushen

**Build dauert > 5 Minuten**
→ `next build` cacht zwischen den Builds. Bei sehr grossen Repos in den Vercel-Settings → Build & Development → Cache aktivieren.

**Deploy preview zeigt veraltete Daten**
→ LocalStorage des Users ist persistent über Deploys hinweg. Beim Schema-Bump (z.B. `v17 → v18`) wird automatisch frisch gestartet — siehe `src/lib/store.ts` `name`-Property.

## Mein nächster Schritt

Sobald das Deployment läuft:
1. URL ins README einfügen
2. Tiago den Link schicken
3. Vorausschau Etappe 4: Supabase-Account anlegen (Region Frankfurt) und in Vercel als Env-Variablen `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` einrichten — passiert wenn Auth dran ist.
