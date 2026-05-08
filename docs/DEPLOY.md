# Deployment

Aktuelle Empfehlung: **Netlify** (du hast den Account schon). Vercel als Alternative — beide haben Free-Tiers, beide reichen für Etappe 1–3.

---

## Netlify (~ 15 Min)

### 1. Site importieren

1. [app.netlify.com](https://app.netlify.com) öffnen, mit deinem Account einloggen
2. **Add new site → Import an existing project**
3. **GitHub** wählen → ggf. Netlify als App in deinem GitHub-Account installieren (du siehst nur Repos, die du autorisierst)
4. **Repository auswählen**: `CuiraTool/finanzplanung`

### 2. Build-Konfiguration

Netlify schlägt automatisch eine Konfiguration vor. Die wichtigen Werte:

| Feld | Wert |
|---|---|
| Branch to deploy | `main` |
| Base directory | (leer lassen) |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Publish directory | `.next` |
| Functions directory | (leer lassen) |

Diese Werte stehen auch in der `netlify.toml` im Repo — Netlify liest sie automatisch und überschreibt das UI.

### 3. Next.js-Plugin

Netlify installiert `@netlify/plugin-nextjs` automatisch beim ersten Build. Falls nicht (selten):

- Site Settings → Build & Deploy → Build Plugins → **Add plugin** → `@netlify/plugin-nextjs`

### 4. Deploy

- **Deploy site** klicken
- Erster Build ~ 3–5 Min (pnpm install + Next.js compile)
- URL wird als `<random>.netlify.app` vergeben — kannst du in den Site-Settings auf was Sinnvolles wie `cuira-finanzplanung` umstellen

### 5. Auto-Deploy

Ist automatisch konfiguriert: jeder Commit auf `main` triggert ein neues Deploy. Pull Requests bekommen Deploy-Previews unter eigenen URLs.

### Custom Domain `plan.cuirapartners.ch`

Sobald du das willst:

1. **Netlify**: Site Settings → Domain Management → **Add custom domain** → `plan.cuirapartners.ch`
2. Netlify zeigt dir den DNS-Eintrag, den du beim Domain-Provider (vermutlich euer Hosting für `cuirapartners.ch`) machen musst:
   - Typ `CNAME`, Name `plan`, Wert `<deine-site>.netlify.app`
3. Beim Provider eintragen, 5 Min bis 1 Stunde warten
4. Netlify schaltet **Let's-Encrypt-SSL** automatisch frei → `https://plan.cuirapartners.ch`

### Free-Tier-Grenzen

- 100 GB Bandwidth/Monat
- 300 Build-Minuten/Monat
- Auto-Deployment, Preview-URLs, SSL inklusive
- Reicht für Etappe 1–3 voll und ganz

### Pro-Tier ($19/Monat) brauchst du erst, wenn:

- Password Protection auf Preview-URLs (für unauthorisierte Drittpersonen-Zugriffe)
- Mehr Build-Minuten (>300/Monat — bei kleinem Repo unrealistisch)
- Team-Funktionen

---

## Vercel — Alternative

Funktioniert exakt gleich wie Netlify, etwas tiefere Next.js-Integration (ist von der Next.js-Firma selbst gebaut). Wenn du später wechseln willst, kein Drama: gleicher Workflow, gleiches Repo.

Schritte:
1. [vercel.com](https://vercel.com) → Sign Up mit GitHub
2. Add New → Project → `CuiraTool/finanzplanung`
3. Framework Preset: Next.js (auto-detected)
4. Install Command: `pnpm install --frozen-lockfile`
5. Deploy

Die `netlify.toml` wird von Vercel ignoriert — kein Konflikt.

---

## Datenschutz

Aktuell speichert das Tool **alle Daten nur im Browser des Users** (LocalStorage). Es geht nichts an einen Server. Damit ist sowohl Netlify- als auch Vercel-Hosting heute unbedenklich.

**Achtung ab Etappe 4** (Supabase-Integration): Daten müssen in einer EU-Region liegen (Supabase Frankfurt). Hosting bleibt unkritisch, weil Supabase die persistente Schicht ist.

---

## Troubleshooting

**Build schlägt fehl: "pnpm not found"**
→ Netlify aktiviert pnpm via Corepack automatisch. Falls Probleme: in den Site-Settings unter Build & Deploy → Environment → Variable `PNPM_VERSION = 11` setzen.

**Build schlägt fehl: "Cannot find module"**
→ Lokal `pnpm install` durchziehen, `pnpm-lock.yaml` committen, neu pushen. Lockfile muss mitcommitet sein.

**Build dauert > 5 Minuten**
→ Build-Cache in Netlify-Settings prüfen — sollte die zweite Runde auf < 2 Minuten drücken.

**Charts laden weisse Seite**
→ Browser-Konsole öffnen. Recharts kann mit Hydration-Issues auftauchen, wenn Server- und Client-Render nicht synchronisieren. Alle Chart-Komponenten haben `"use client"` — sollte robust sein.

**LocalStorage-State ist nach Deploy weg**
→ Erwartet: jeder Schema-Bump (siehe `src/lib/store.ts` `name`-Property) startet frisch. Beim ersten Besuch der neuen Version sieht der User Default-Werte.
