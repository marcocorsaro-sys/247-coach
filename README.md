# Irene Tabella

App di coaching **coach ↔ atleta** per Irene Coletto (triathlon, running, swimming).
Irene importa/edita le tabelle di allenamento, le pubblica agli atleti, e fa
evolvere il dialogo con loro tramite l'app.

**Stato:** in sviluppo — Sprint 0 (fondazione backend completata). 2026-05.

## I quattro pilastri (dal prototipo)

- **Panoramica** — oggi + colpo d'occhio settimanale (atleta) / dashboard atleti (coach)
- **Test fisici** — soglie/zone e rilevazioni, per disciplina, versionate nel tempo
- **Tabelle** — import Excel → editing/arricchimento in app → pubblicazione → re-export Excel/PDF
- **Gare obiettivo** — gare A/B/C con date e countdown

Gli atleti sono **multi-disciplina** (corsa, nuoto, bici, athletics): le discipline
sono configurabili per atleta, non fisse sul triathlon.

## Stack

- **Frontend:** Next.js (App Router) — da scaffoldare
- **Backend:** Supabase (Postgres 17 + Auth + RLS), regione `eu-central-1`
- **Hosting:** Vercel (`irene-coletto-tabella`)
- **Design:** vedi `App_Prototipo_v2.html` (riferimento di design; tema scuro/lime,
  Inter + JetBrains Mono + Instrument Serif)

## Backend Supabase

Progetto dedicato **`irene-tabella-app`** (ref `rtupetcwvvtzzqxdcjcq`).

> ⚠️ Da non confondere con il progetto Supabase **`Tabella`**: quello è il backend
> del **sito irenecolettocoaching** (form contatti, camp), non di questa app.

Schema applicato tramite le migration in `supabase/migrations/`:

- `0001_mvp_core_schema.sql` — modello relazionale + RLS
  (profili/ruoli, relazione coach-atleta, discipline, metriche/test, gare,
  settimane con revisioni, sessioni, step strutturati, log/feedback, dialogo)
- `0002_security_hardening.sql` — funzioni helper RLS in schema privato `app`,
  search_path fissati, hardening (security advisor pulito, 0 lint)

Types TypeScript generati in `supabase/database.types.ts`
(rigenerare dopo ogni migration).

### Modello dati (sintesi)

`profiles` (coach/atleta) · `coaching_relationships` · `athlete_disciplines` ·
`athlete_metrics` (test/zone) · `races` · `training_weeks` (con `version` e
`previous_week_id` per le revisioni) · `sessions` (cella griglia giorno×disciplina) ·
`session_steps` (struttura fine: step/ripetute/target) · `session_logs`
(completamento+feedback) · `comments` (dialogo coach↔atleta).

RLS: ogni coach vede solo i propri atleti, ogni atleta solo i propri dati.

## Integrazione Strava

Connessione **OAuth per-atleta** per importare le **attività svolte** (Strava → app),
così il coach vede pianificato vs svolto.

- **DB** — `0009_strava_integration.sql`: `strava_connections` (token OAuth per
  atleta, RLS *owner-only*: i token non sono mai leggibili dal coach) ·
  `strava_activities` (attività importate, leggibili dal coach collegato) ·
  `strava_status()` (stato connessione senza esporre i token).
- **Flusso** — l'atleta apre `/atleta` → sezione **Strava** → "Collega Strava"
  (`/atleta/strava/connect`) → autorizza su Strava → callback
  `/auth/strava/callback` salva i token → "Sincronizza attività" importa gli
  allenamenti (refresh automatico del token quando scade).
- **Scope richiesto** — `read,activity:read_all`.
- **Config** — variabili `NEXT_PUBLIC_STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET`
  (vedi `.env.local.example`); nel pannello Strava imposta *Authorization
  Callback Domain* col dominio dell'app. Il **tier standard** consente **1 solo
  atleta connesso**: per più atleti va richiesto l'aumento del limite a Strava.

> ⚠️ I token Strava sono salvati in chiaro nel DB, protetti da RLS owner-only.
> Per indurire in futuro: cifratura a riposo (pgcrypto/Vault) o storage dedicato.

## Roadmap MVP

- **Sprint 0** — fondamenta: schema DB ✓ · scaffold Next.js + Supabase · auth/ruoli · design token
- **Sprint 1** — coach core + multi-disciplina: dashboard, profilo atleta, Test fisici, Gare
- **Sprint 2** — Tabelle: import Excel → step → editor → pubblicazione → re-export Excel/PDF
- **Sprint 3** — esperienza atleta (Panoramica/settimana/storico) responsive + completamento/feedback
- **Sprint 4** — dialogo coach↔atleta, rifinitura, audit RLS, beta con Irene

## Fase 2 (post-MVP)

Creazione file allenamento per **Garmin** e **Polar** (.FIT / .TCX / API), a livello
di singolo allenamento e di tabella intera. Lo schema è già predisposto: le zone
in `athlete_metrics` e gli step in `session_steps` sono i dati necessari alla
conversione verso i dispositivi.

## Sito pubblico 24/7 Coach (gare)

Solo in modalità `ai_coach`: `/` (landing + Race Advisor), `/gare`, `/gare/[slug]`,
`/gare/[slug]/[articolo]`. Dati in `event_races` + `event_race_segments|reviews|sources|articles|media`
(migration `0029`), lettura anonima via RLS, ISR 1 h.

Pipeline contenuti per gara (route protette da `CRON_SECRET`, da browser):

- `GET /api/site/seed?secret=…&slug=nizza-2027` — applica la scheda da `lib/site/seed/<slug>.ts`
  (scheda, segmenti, recensione-sintesi, fonti, media). `slug=all` per tutti i seed.
- `GET /api/site/harvest?secret=…&slug=nizza-2027&sources=youtube,google,instagram&limit=30` —
  raccolta via Apify (`APIFY_TOKEN` su Vercel): salva URL + metadati in `event_race_sources`
  e i post/video in `event_race_media` (link/embed al post originale, nessun file copiato).
  Termini di ricerca: `harvest` nel seed, altrimenti derivati dal nome ufficiale.
- `GET /api/site/articles?secret=…&slug=nizza-2027[&publish=1][&topics=bike,run]` — Claude scrive
  un articolo per tema (swim, bike, run, logistics, nutrition, gear, raceday) dalle fonti
  indicizzate, con `source_ids`, e rigenera le FAQ. Bozza salvo `publish=1`.

Nuova gara ricca: aggiungere `lib/site/seed/<slug>.ts`, registrarlo in `lib/site/seed/index.ts`,
poi seed → harvest → articles.

## Traduzioni (12 lingue)
Con `CRON_SECRET`:
- UI: `/api/site/translate?secret=…&ui=1` (tutte tranne en/it) oppure `&langs=de,fr`
- Gara: `/api/site/translate?secret=…&slug=nizza-2027[&langs=en,de][&articles=1]`
Una lingua alla volta se il timeout stringe. Fallback automatico: chiave → EN, contenuto → italiano.
