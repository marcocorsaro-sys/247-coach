// ============================================================================
// Motore 24/7 Coach: costruisce il contesto dell'atleta, chiede a Claude il
// piano (JSON strutturato), applica i guard-rail e scrive settimane/sessioni/
// step nelle tabelle esistenti a nome del coach AI. Da lì in poi la pipeline
// è quella di sempre: pubblicazione → push su Intervals/Garmin → attività →
// RPE.
//
// Sicurezza dell'atleta:
//  - i target sono SOLO zone (interpretate sui valori testati dell'atleta),
//    RPE o testo — mai numeri assoluti inventati dal modello;
//  - guard-rail nel codice: volume settimanale tetto rispetto alla
//    disponibilità dichiarata, max 2 sedute/giorno, zone clampate.
// ============================================================================

import { loadReadiness, readinessText } from "@/lib/server/readiness";
import { notifyPlanUpdated } from "@/lib/notify/athlete";
import { athletePerformance } from "@/lib/server/raceHistory";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStructured } from "@/lib/ai/claude";
import { summarizeHistory } from "@/lib/ai/history";
import { AI_COACH_ID } from "@/lib/ai/mode";
import { addDays, mondayOf, toISODate, weekLabel } from "@/lib/training/weeks";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { syncIcuActivities } from "@/lib/server/icuSync";
import { computeForm, formText } from "@/lib/ai/fitness";
import { listRoutes, rebuildRouteCatalog, routesText, syncTracks } from "@/lib/server/routes";

// ---------------------------------------------------------------- schema JSON

const LEAF_STEP = {
  type: "object",
  additionalProperties: false,
  properties: {
    step_type: { type: "string", enum: ["warmup", "work", "cooldown"] },
    duration_seconds: {
      type: ["integer", "null"],
      description:
        "OBBLIGATORIO per gli step a tempo (null solo se lo step è a distanza). La somma di tutti gli step deve coincidere con volume_value della seduta.",
    },
    distance_meters: { type: ["integer", "null"] },
    target_type: { type: "string", enum: ["zone", "rpe", "text"] },
    target_low: { type: ["number", "null"], description: "Zona (1-5) o RPE (1-10)" },
    target_high: { type: ["number", "null"] },
    target_unit: { type: ["string", "null"], description: "Solo per target testuale" },
    recovery_text: { type: ["string", "null"], description: "Recupero, es. 90s fermo" },
    note: { type: ["string", "null"] },
  },
  required: [
    "step_type", "duration_seconds", "distance_meters", "target_type",
    "target_low", "target_high", "target_unit", "recovery_text", "note",
  ],
} as const;

export const STEP = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...LEAF_STEP.properties,
    step_type: { type: "string", enum: ["warmup", "work", "cooldown", "repeat"] },
    repeat_count: { type: ["integer", "null"], description: "Solo per step_type=repeat" },
    sub_steps: {
      type: ["array", "null"],
      description: "Solo per step_type=repeat: gli step da ripetere",
      items: LEAF_STEP,
    },
  },
  required: [...LEAF_STEP.required, "repeat_count", "sub_steps"],
} as const;

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    rationale: {
      type: "string",
      description:
        "Spiegazione del piano rivolta all'atleta, in italiano: periodizzazione fino alla gara, logica dei blocchi, cosa aspettarsi. Tono da coach esperto e incoraggiante.",
    },
    athlete_message: {
      type: "string",
      description: "Breve messaggio personale all'atleta su questa/e settimana/e (2-4 frasi).",
    },
    weeks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          week_start: { type: "string", description: "Lunedì della settimana, YYYY-MM-DD" },
          focus: { type: "string", description: "Focus della settimana in 1-2 frasi (visibile all'atleta)" },
          sessions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                day_of_week: { type: "integer", description: "0=lunedì … 6=domenica" },
                discipline: { type: "string", enum: ["swim", "bike", "run", "athletics", "other"] },
                title: { type: "string", description: "Titolo breve, es. 'Fondo progressivo'" },
                volume_value: { type: "string", description: "Durata/volume, es. \"1h10'\" o \"2500m\"" },
                notes: {
                  type: "string",
                  description: "Descrizione leggibile della seduta per l'atleta (cosa fare e perché)",
                },
                steps: { type: "array", items: STEP },
                route_id: {
                  type: ["string", "null"],
                  description:
                    "Id (tra parentesi quadre) di uno dei PERCORSI ABITUALI dell'atleta adatto alla seduta, oppure null se nessuno è adatto o la seduta è indoor/palestra. Scegli per sport, durata, dislivello e scopo della seduta.",
                },
                route_note: {
                  type: ["string", "null"],
                  description: "Perché quel percorso per questa seduta (1 frase), o cosa cercare se null (es. 'serve un anello di 40 km con poco dislivello').",
                },
              },
              required: ["day_of_week", "discipline", "title", "volume_value", "notes", "steps", "route_id", "route_note"],
            },
          },
        },
        required: ["week_start", "focus", "sessions"],
      },
    },
  },
  required: ["rationale", "athlete_message", "weeks"],
} as const;

export interface AiLeafStep {
  step_type: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  target_type: string;
  target_low: number | null;
  target_high: number | null;
  target_unit: string | null;
  recovery_text: string | null;
  note: string | null;
}
export interface AiStep extends AiLeafStep {
  repeat_count: number | null;
  sub_steps: AiLeafStep[] | null;
}
interface AiSession {
  day_of_week: number;
  discipline: string;
  title: string;
  volume_value: string;
  notes: string;
  steps: AiStep[];
  route_id?: string | null;
  route_note?: string | null;
}
interface AiWeek {
  week_start: string;
  focus: string;
  sessions: AiSession[];
}
export interface AiPlan {
  rationale: string;
  athlete_message: string;
  weeks: AiWeek[];
}

// ---------------------------------------------------------------- contesto


/** Lingua dell'atleta (profilo): i testi rivolti a lui vanno scritti in quella lingua. */
async function langNote(admin: SupabaseClient, athleteId: string): Promise<string> {
  const { data } = await admin.from("profiles").select("lang").eq("id", athleteId).maybeSingle();
  return (data as { lang?: string } | null)?.lang === "en"
    ? "\n\nLANGUAGE: the athlete speaks English. Write EVERY athlete-facing text (session titles, session notes, week comments, athlete_message, rationale) in clear, natural English. Keep the JSON field names unchanged."
    : "";
}

const SYSTEM = `Sei 24/7 Coach: un allenatore di triathlon, trail running e ultra endurance di livello mondiale.
Costruisci piani personalizzati con la cura del miglior personal trainer: periodizzazione a blocchi verso la gara obiettivo, progressione prudente del carico (mai oltre ~10% di volume a settimana), settimane di scarico ogni 3-4, rispetto ASSOLUTO dei vincoli di tempo e attrezzatura dichiarati, attenzione a infortuni e limitazioni.
Se lo SPORT FOCUS è "ultra_endurance" (atleta ibrido ultra-trail + bici lunghissima, nessun nuoto):
- la stagione ha PIÙ gare obiettivo: ragiona a BLOCCHI in sequenza (es. base invernale corsa+bici → blocco specifico bici verso la granfondo → transizione corsa con la gamba aerobica già costruita → blocco ultra-trail con lunghi e dislivello crescenti), con una settimana di recupero attivo dopo ogni gara A e un tapering di 7-14 giorni prima.
- disciplina "bike" e "run" in calendario insieme: il volume aerobico a basso impatto va in bici, la specificità (dislivello, discesa, camminata veloce in salita con bastoncini, lunghi) va nella corsa trail.
- le sedute di FORZA in palestra sono gestite da un preparatore esterno: NON pianificarle, ma inseriscile come seduta discipline "other", titolo "Palestra (scheda trainer)", target "text", nei giorni dichiarati, e NON mettere intensità di corsa o ripetute in salita il giorno dopo la palestra.
- i giorni feriali hanno un tetto per seduta (WEEKDAY MAX): mai superarlo; i lunghi vanno nel weekend, dove il tetto è più alto e nei blocchi di carico puoi usare lungo sabato + medio-lungo domenica (back-to-back) con prudenza.
- usa l'ultimo grande sforzo nello storico (es. gara ultra appena fatta) come riferimento di forma e di recupero, non come carico da ripetere subito.
Regole sui target degli step:
- target_type "zone": usa SOLO numeri di zona 1-5 (Z1 recupero … Z5 VO2max); l'app li traduce nei valori personali testati dell'atleta.
- Se le soglie dell'atleta non sono note per una disciplina, usa target_type "rpe" (1-10) e inserisci nella prima settimana i test per stabilirle (es. test 20' bici, test 5km corsa, 400m nuoto), spiegandoli nelle note.
- Non inventare MAI passi, watt o battiti assoluti.
COERENZA DURATE (obbligatoria):
- OGNI step deve avere duration_seconds valorizzato (per il nuoto va bene distance_meters al posto della durata).
- La struttura a step deve essere COMPLETA: riscaldamento + lavoro + defaticamento, non solo il riscaldamento.
- Ogni seduta a tempo ha ALMENO 3 step: riscaldamento, la parte centrale di lavoro (uno o più step "work" che coprono la maggior parte della durata), defaticamento. MAI solo avvio e chiusura.
- La somma delle durate degli step (ripetute moltiplicate) DEVE corrispondere a volume_value della seduta (tolleranza ±10%).
- Le note della seduta devono descrivere esattamente gli step, con gli stessi numeri.
PERCORSI: per ogni seduta outdoor scegli, se esiste, uno dei PERCORSI ABITUALI dell'atleta (route_id = id tra parentesi quadre) coerente con sport, durata, dislivello e scopo; spiega in route_note perché. Non inventare mai percorsi: se nessuno è adatto, route_id null e in route_note descrivi che tipo di percorso serve.
FORMA: usa CTL/ATL/TSB come un coach usa il PMC: progressione del CTL prudente (3-5 punti/settimana), scarico quando il TSB scende sotto -25, freschezza positiva nei giorni di gara.
Stile: italiano, concreto, incoraggiante ma onesto. Le note delle sedute spiegano il perché, non solo il cosa.`;

async function buildContext(admin: SupabaseClient, athleteId: string): Promise<string> {
  const [profRes, aiRes, fitRes, zonesRes, racesRes, hist, fbRes, askRes, form, routes] = await Promise.all([
    admin.from("profiles").select("full_name, email").eq("id", athleteId).single(),
    admin.from("ai_athlete_profiles").select("*").eq("athlete_id", athleteId).maybeSingle(),
    admin.from("athlete_fitness").select("*").eq("athlete_id", athleteId).maybeSingle(),
    admin
      .from("athlete_custom_zones")
      .select("discipline, zone_name, range_text")
      .eq("athlete_id", athleteId)
      .order("discipline")
      .order("sort_order"),
    admin
      .from("races")
      .select("name, race_date, location, distance_label, target_time, priority")
      .eq("athlete_id", athleteId)
      .gte("race_date", toISODate(new Date()))
      .order("race_date"),
    summarizeHistory(admin, athleteId),
    admin
      .from("ai_feedback")
      .select("message, created_at")
      .eq("athlete_id", athleteId)
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("ai_adaptive_events")
      .select("detail")
      .eq("athlete_id", athleteId)
      .eq("action", "asked")
      .is("resolved_at", null)
      .order("event_date", { ascending: false })
      .limit(2),
    computeForm(admin, athleteId),
    listRoutes(admin, athleteId),
  ]);

  const p = profRes.data as { full_name: string | null } | null;
  const ai = (aiRes.data ?? {}) as Record<string, unknown>;
  const fit = (fitRes.data ?? null) as Record<string, unknown> | null;
  const zones = (zonesRes.data ?? []) as { discipline: string; zone_name: string; range_text: string }[];
  const races = (racesRes.data ?? []) as Record<string, unknown>[];

  const fitLines = fit
    ? Object.entries({
        "data di nascita": fit.birth_date,
        "altezza cm": fit.height_cm,
        "peso kg": fit.weight_kg,
        "massa grassa %": fit.body_fat_pct,
        "FC riposo": fit.resting_hr,
        "FC max": fit.max_hr,
        "FC soglia (LTHR)": fit.lthr,
        "passo soglia corsa (s/km)": fit.threshold_pace_run_s_per_km,
        "FTP bici (W)": fit.ftp_watts,
        "CSS nuoto (s/100m)": fit.css_swim_s_per_100m,
      })
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ")
    : "nessun dato";

  // Storico gare ricostruito dalle attività + proiezione sulla gara A.
  let perfText = "";
  try { perfText = (await athletePerformance(admin, athleteId)).text; } catch { /* storico non disponibile */ }
  let readyText = "";
  try { readyText = readinessText(await loadReadiness(admin as never, athleteId)); } catch { /* niente benessere */ }

  return [
    `ATLETA: ${p?.full_name ?? "—"}`,
    `SPORT FOCUS: ${ai.sport ?? "triathlon"}`,
    `LIVELLO/ESPERIENZA: ${ai.experience_level ?? "?"} — ${ai.experience_notes ?? ""}`,
    `OBIETTIVO (raccontato dall'atleta): ${ai.goal_notes ?? "—"}`,
    perfText,
    (ai as { gym_plan?: string | null }).gym_plan
      ? `=== SCHEDA PALESTRA DELL'ATLETA (usa SEMPRE questa per le sedute di forza) ===\n${(ai as { gym_plan: string }).gym_plan}\nRegole: ogni seduta di palestra in tabella è questa scheda (discipline "other", titolo "Palestra — scheda forza IM", durata come da scheda e periodo della stagione). L'atleta ce l'ha già sull'orologio con le animazioni: nella seduta metti solo un riepilogo (blocchi, serie, eventuale variante del periodo: scarico, carico fermo, solo core prima delle gare) e NON inventare altri esercizi. Mantieni il numero di sedute di palestra settimanali già previsto (di norma 1) e non metterla il giorno prima di lunghi o qualità di corsa.\n=== FINE SCHEDA PALESTRA ===`
      : "",
    (ai as { coach_directives?: string | null }).coach_directives
      ? `=== INDICAZIONI DELL'ALLENATORE (persona reale che segue l'atleta) ===\n${(ai as { coach_directives: string }).coach_directives}\nSeguile con priorità sulle tue scelte di periodizzazione, volumi e tipologia di sedute. Fanno eccezione solo la sicurezza (dolore, malattia, infortuni dichiarati): in quel caso sii prudente e spiegalo in athlete_message.\n=== FINE INDICAZIONI ===`
      : "",
    (ai as { shadow_plan?: boolean }).shadow_plan
      ? "=== TABELLA OMBRA ===\nL'atleta segue già il piano di un altro allenatore e NON eseguirà questa tabella: non giudicare l'aderenza e non 'recuperare' sedute. Usa gli allenamenti reali dello storico come carico effettivamente svolto e la forma attuale (CTL/ATL/TSB, prontezza) come punto di partenza. Costruisci la tabella che proporresti tu per l'obiettivo A, come confronto."
      : "",
    readyText ? `${readyText}\nUsa la prontezza per modulare i primi giorni: sotto 55 per più giorni riduci intensità e volume; sopra 75 la qualità è ben tollerata.` : "",
    (ai as { reference_plan?: string | null }).reference_plan
      ? `=== PIANO DI RIFERIMENTO DELL'ATLETA (ispirazione, non da copiare alla lettera) ===
L'atleta ha chiesto di ispirarti a questo piano e alle sue sedute, adattandole via via ai suoi tempi reali. Regole:
1) Usa struttura, fasi, cicli 3+1, progressione delle ore, tipologie di seduta e sedute chiave come base della periodizzazione: allinea la settimana corrente alla settimana del conto alla rovescia con la stessa data.
2) INTENSITÀ: ricalcola SEMPRE FC, watt e passi dalle soglie del profilo (FITNESS/ZONE sopra) e dallo storico reale, MAI dalle soglie scritte nel file, che l'atleta stesso ritiene sbagliate. Le zone Z1-Z5 del file vanno tradotte nelle zone del profilo.
3) Vincoli del profilo (giorni di riposo, minuti feriali, infortuni, note mediche, disponibilità) prevalgono sul file: se il file mette una seduta in un giorno di riposo, spostala sul giorno libero più sensato.
4) Adatta il volume se l'aderenza o la forma reale non reggono le ore del file; mai recuperare sedute perse. Nel campo "notes" della seduta, quando la prendi dal file, cita l'origine (es. "da Bertucelli: scalette tecniche").
${(ai as { reference_plan: string }).reference_plan}
=== FINE PIANO DI RIFERIMENTO ===`
      : "",
    `GARE IN CALENDARIO: ${
      races.length
        ? races
            .map(
              (r) =>
                `${r.name} (${r.race_date}, ${r.distance_label ?? "?"}, priorità ${r.priority ?? "?"}, obiettivo ${r.target_time ?? "finire"})`,
            )
            .join("; ")
        : "nessuna inserita"
    }`,
    `DISPONIBILITÀ: ${ai.availability_days ?? "?"} giorni/settimana, ~${ai.availability_hours ?? "?"} ore/settimana.${
      ai.weekday_minutes_max != null
        ? ` WEEKDAY MAX: ${ai.weekday_minutes_max} minuti per seduta dal lunedì al venerdì (mattina presto, prima del lavoro).`
        : ""
    }${
      ai.weekend_hours_max != null
        ? ` WEEKEND: fino a ~${ai.weekend_hours_max} ore totali tra sabato e domenica nei blocchi di carico (il lungo si fa qui).`
        : ""
    } Vincoli fissi: ${ai.fixed_constraints ?? "nessuno"}`,
    Array.isArray((ai as { rest_days?: number[] | null }).rest_days) && (ai as { rest_days: number[] }).rest_days.length
      ? `GIORNI DI RIPOSO SCELTI DALL'ATLETA (vincolo rigido, nessuna seduta): ${(ai as { rest_days: number[] }).rest_days.map((d) => ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"][d]).join(", ")}.`
      : "GIORNO DI RIPOSO: l'atleta non ha preferenze, sceglilo tu in modo coerente con la settimana (di solito dopo il lungo o il giorno più pieno di impegni).",
    ai.strength_sessions_per_week
      ? `FORZA IN PALESTRA (gestita da preparatore esterno, NON pianificarla): ${ai.strength_sessions_per_week} sedute/settimana. ${ai.strength_notes ?? ""}`
      : "",
    `ATTREZZATURA: ${ai.equipment ?? "non specificata"}`,
    ai.home_base || ai.weekend_base
      ? `DOVE SI ALLENA: feriali a ${ai.home_base ?? "?"}; weekend a ${ai.weekend_base ?? ai.home_base ?? "?"} (scegli i percorsi coerenti con il luogo del giorno; se l'atleta ha scritto che sarà altrove, segui il messaggio).`
      : "",
    `INFORTUNI/LIMITAZIONI: ${ai.injuries ?? "nessuna dichiarata"}`,
    `SOGLIE/TEST NOTI: ${fitLines}`,
    zones.length
      ? `ZONE PERSONALIZZATE GIÀ DEFINITE:\n${zones.map((z) => `  ${z.discipline} ${z.zone_name}: ${z.range_text}`).join("\n")}`
      : "ZONE PERSONALIZZATE: nessuna (usa zone 1-5 o RPE)",
    formText(form),
    `STORICO ATTIVITÀ (da Garmin/Strava via Intervals):\n${hist.text}`,
    `PERCORSI ABITUALI (dalle tracce GPS, id tra parentesi quadre):\n${routesText(routes)}`,
    (() => {
      const asks = (askRes.data ?? []) as { detail: string }[];
      return asks.length
        ? `DOMANDE APERTE DEL COACH ALL'ATLETA (poste dall'app dopo il confronto piano/svolto — un nuovo messaggio dell'atleta probabilmente risponde a queste):\n${asks
            .map((a) => `  ${a.detail}`)
            .join("\n")}`
        : "";
    })(),
    (() => {
      const fb = (fbRes.data ?? []) as { message: string; created_at: string }[];
      return fb.length
        ? `ULTIMI MESSAGGI DELL'ATLETA AL COACH (dal più recente — tienine conto):\n${fb
            .map((f) => `  [${f.created_at.slice(0, 10)}] ${f.message}`)
            .join("\n")}`
        : "MESSAGGI DELL'ATLETA: nessuno.";
    })(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------- guard-rail

function clamp(n: number | null, lo: number, hi: number): number | null {
  if (n == null) return null;
  return Math.max(lo, Math.min(hi, n));
}

export function sanitizeLeaf(s: AiLeafStep): AiLeafStep {
  const isZone = s.target_type === "zone";
  const isRpe = s.target_type === "rpe";
  return {
    ...s,
    duration_seconds: s.duration_seconds != null ? clamp(s.duration_seconds, 30, 6 * 3600) : null,
    distance_meters: s.distance_meters != null ? clamp(s.distance_meters, 25, 250_000) : null,
    target_low: isZone ? clamp(s.target_low, 1, 5) : isRpe ? clamp(s.target_low, 1, 10) : s.target_low,
    target_high: isZone ? clamp(s.target_high, 1, 5) : isRpe ? clamp(s.target_high, 1, 10) : s.target_high,
  };
}

/** "3h30'" → 12600, "1h" → 3600, "45'" → 2700; null per distanze ("2500m"). */
export function parseVolume(v: string | null | undefined): number | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  const hm = s.match(/^(\d+)\s*h\s*(\d+)?/);
  if (hm) return Number(hm[1]) * 3600 + Number(hm[2] ?? 0) * 60;
  const min = s.match(/^(\d+)\s*(?:'|min)/);
  if (min) return Number(min[1]) * 60;
  return null;
}

/** "1h10'", "45'" — stesso formato dei titoli evento. */
export function fmtVolume(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h${String(m).padStart(2, "0")}'` : `${h}h`;
  return `${m}'`;
}

export function stepsSeconds(steps: AiStep[]): number {
  let tot = 0;
  for (const st of steps) {
    if (st.step_type === "repeat" && st.sub_steps) {
      const reps = st.repeat_count && st.repeat_count > 0 ? st.repeat_count : 1;
      tot += reps * st.sub_steps.reduce((a, l) => a + (l.duration_seconds ?? 0), 0);
    } else {
      tot += st.duration_seconds ?? 0;
    }
  }
  return tot;
}

function sessionSeconds(s: AiSession): number {
  return stepsSeconds(s.steps);
}

/** Clampa durate/zone/RPE di una lista di step (con eventuali ripetute). */
export function sanitizeSteps(steps: AiStep[]): AiStep[] {
  return steps.map((st) => ({
    ...sanitizeLeaf(st),
    step_type: st.step_type,
    // Minimo 1, non 2: "1x (90'' + 90'')" e' una ripetuta legittima e
    // arrotondarla a 2 raddoppiava in silenzio il lavoro dell'atleta.
    repeat_count: st.repeat_count != null ? clamp(st.repeat_count, 1, 30) : null,
    sub_steps: st.sub_steps ? st.sub_steps.map(sanitizeLeaf) : null,
  }));
}

/**
 * Coerenza durata dichiarata ↔ step: se la somma degli step non copre la
 * durata dichiarata (±10%), estende lo step di lavoro più lungo o inserisce
 * la parte centrale mancante prima del defaticamento. Restituisce gli step
 * (mutati) e la somma finale in secondi.
 */
export function repairStepsCoherence(
  steps: AiStep[],
  volumeValue: string,
): { steps: AiStep[]; totalSec: number } {
  const decl = parseVolume(volumeValue);
  let sec = stepsSeconds(steps);
  if (decl != null && sec > 0 && sec < decl * 0.9) {
    const deficit = decl - sec;
    const works = steps.filter(
      (st) => st.step_type === "work" && st.duration_seconds != null,
    );
    if (works.length) {
      const longest = works.reduce((a, b) =>
        (b.duration_seconds ?? 0) > (a.duration_seconds ?? 0) ? b : a,
      );
      longest.duration_seconds = (longest.duration_seconds ?? 0) + deficit;
    } else {
      const main: AiStep = {
        step_type: "work",
        duration_seconds: deficit,
        distance_meters: null,
        target_type: "text",
        target_low: null,
        target_high: null,
        target_unit: null,
        recovery_text: null,
        note: "Parte centrale della seduta — segui le note",
        repeat_count: null,
        sub_steps: null,
      };
      const last = steps.length - 1;
      if (last >= 0 && steps[last].step_type === "cooldown") {
        steps.splice(last, 0, main);
      } else {
        steps.push(main);
      }
    }
    sec = stepsSeconds(steps);
  }
  return { steps, totalSec: sec };
}

export interface PlanCaps {
  availability_hours: number | null;
  weekday_minutes_max?: number | null;
  weekend_hours_max?: number | null;
}

/** Riduce proporzionalmente le durate degli step (ripetute incluse). */
function scaleSteps(steps: AiStep[], factor: number): void {
  for (const st of steps) {
    if (st.duration_seconds != null) st.duration_seconds = Math.round(st.duration_seconds * factor);
    if (st.sub_steps) {
      for (const l of st.sub_steps) {
        if (l.duration_seconds != null) l.duration_seconds = Math.round(l.duration_seconds * factor);
      }
    }
  }
}

function sanitizePlan(plan: AiPlan, caps: PlanCaps): AiPlan {
  const availabilityHours = caps.availability_hours;
  // Tetto settimanale: disponibilità dichiarata +20%; con la disponibilità
  // strutturata (feriale/weekend) il tetto è la somma dei due.
  const structured =
    caps.weekday_minutes_max != null && caps.weekend_hours_max != null
      ? (caps.weekday_minutes_max * 5) / 60 + caps.weekend_hours_max
      : null;
  const baseHours = structured ?? (availabilityHours && availabilityHours > 0 ? availabilityHours : 12);
  const capSec = baseHours * 3600 * 1.2;
  const weekdayCapSec = caps.weekday_minutes_max ? caps.weekday_minutes_max * 60 : null;
  const weeks = plan.weeks.map((w) => {
    // normalizza il lunedì
    const monday = toISODate(mondayOf(w.week_start));
    // max 2 sedute/giorno
    const perDay = new Map<number, number>();
    let sessions = w.sessions.filter((s) => {
      const d = clamp(s.day_of_week, 0, 6) ?? 0;
      const n = perDay.get(d) ?? 0;
      if (n >= 2) return false;
      perDay.set(d, n + 1);
      return true;
    });
    sessions = sessions.map((s) => {
      const next: AiSession = {
        ...s,
        day_of_week: clamp(s.day_of_week, 0, 6) ?? 0,
        steps: sanitizeSteps(s.steps),
      };
      // Coerenza titolo/durata/step: ciò che finisce sull'orologio sono gli
      // step, quindi prima si ripara l'eventuale parte centrale mancante e
      // poi il volume mostrato segue la somma reale.
      let { totalSec } = repairStepsCoherence(next.steps, next.volume_value);
      // Guard-rail feriale: una seduta lun-ven non può superare il tetto
      // dichiarato (+10%); la palestra ("other") non conta.
      if (
        weekdayCapSec != null &&
        next.day_of_week <= 4 &&
        next.discipline !== "other" &&
        totalSec > weekdayCapSec * 1.1
      ) {
        scaleSteps(next.steps, weekdayCapSec / totalSec);
        totalSec = stepsSeconds(next.steps);
        next.notes = `${next.notes}\n(Durata adattata al tuo tetto feriale di ${Math.round(weekdayCapSec / 60)}'.)`;
      }
      if (totalSec >= 10 * 60) next.volume_value = fmtVolume(totalSec);
      return next;
    });
    // tetto sul volume: se sfora, taglia le sedute meno importanti (dalla fine)
    let tot = sessions.reduce((a, s) => a + sessionSeconds(s), 0);
    while (tot > capSec && sessions.length > 1) {
      const dropped = sessions.pop()!;
      tot -= sessionSeconds(dropped);
    }
    return { ...w, week_start: monday, sessions };
  });
  return { ...plan, weeks };
}

// ---------------------------------------------------------------- scrittura

/**
 * Il modello ragiona in warmup/work/cooldown, ma il check del DB ammette
 * warmup/interval/recovery/steady/cooldown/rest/repeat: "work" → "steady".
 */
export function dbStepType(t: string): string {
  return t === "work" ? "steady" : t;
}

/** Il DB ammette rpe/zone/power/pace/hr/cadence/open: "text" → "open". */
export function dbTargetType(t: string): string {
  return t === "text" ? "open" : t;
}

/**
 * Scrive gli step di una sessione (ripetute incluse) traducendo i tipi nei
 * valori ammessi dal DB. Un insert fallito fa fallire tutta l'operazione.
 */
export async function insertSessionSteps(
  admin: SupabaseClient,
  sessionId: string,
  steps: AiStep[],
  aiGenerated: boolean,
): Promise<void> {
  let sort = 0;
  for (const st of steps) {
    if (st.step_type === "repeat" && st.sub_steps?.length) {
      const { data: parent, error: parentErr } = await admin
        .from("session_steps")
        .insert({
          session_id: sessionId,
          sort_order: sort++,
          step_type: "repeat",
          repeat_count: st.repeat_count && st.repeat_count > 0 ? st.repeat_count : 1,
          ai_generated: aiGenerated,
        })
        .select("id")
        .single();
      if (parentErr || !parent) throw new Error(`Step (repeat) fallito: ${parentErr?.message}`);
      const parentId = (parent as { id: string }).id;
      for (const leaf of st.sub_steps) {
        const { error: leafErr } = await admin.from("session_steps").insert({
          session_id: sessionId,
          parent_step_id: parentId,
          sort_order: sort++,
          step_type: dbStepType(leaf.step_type),
          duration_seconds: leaf.duration_seconds,
          distance_meters: leaf.distance_meters,
          target_type: dbTargetType(leaf.target_type),
          target_low: leaf.target_low,
          target_high: leaf.target_high,
          target_unit: leaf.target_unit,
          recovery_text: leaf.recovery_text,
          note: leaf.note,
          ai_generated: aiGenerated,
        });
        if (leafErr) throw new Error(`Step fallito: ${leafErr.message}`);
      }
    } else {
      const { error: stepErr } = await admin.from("session_steps").insert({
        session_id: sessionId,
        sort_order: sort++,
        step_type: dbStepType(st.step_type),
        duration_seconds: st.duration_seconds,
        distance_meters: st.distance_meters,
        target_type: dbTargetType(st.target_type),
        target_low: st.target_low,
        target_high: st.target_high,
        target_unit: st.target_unit,
        recovery_text: st.recovery_text,
        note: st.note,
        ai_generated: aiGenerated,
      });
      if (stepErr) throw new Error(`Step fallito: ${stepErr.message}`);
    }
  }
}

async function writeWeek(admin: SupabaseClient, athleteId: string, week: AiWeek): Promise<void> {
  const monday = week.week_start;
  // route_id proposti dal modello: accetta solo id reali del catalogo dell'atleta
  const { data: rts } = await admin.from("athlete_routes").select("id").eq("athlete_id", athleteId);
  const validRoutes = new Set(((rts ?? []) as { id: string }[]).map((r) => r.id));
  const { data: existing } = await admin
    .from("training_weeks")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("week_start", monday)
    .maybeSingle();

  let weekId: string;
  if (existing) {
    weekId = (existing as { id: string }).id;
    await admin.from("sessions").delete().eq("week_id", weekId);
    await admin
      .from("training_weeks")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        coach_comment: week.focus,
        coach_id: AI_COACH_ID,
      })
      .eq("id", weekId);
  } else {
    const { data, error } = await admin
      .from("training_weeks")
      .insert({
        athlete_id: athleteId,
        coach_id: AI_COACH_ID,
        created_by: AI_COACH_ID,
        week_start: monday,
        label: weekLabel(monday),
        status: "published",
        published_at: new Date().toISOString(),
        coach_comment: week.focus,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Creazione settimana ${monday} fallita: ${error?.message}`);
    weekId = (data as { id: string }).id;
  }

  for (const [i, s] of week.sessions.entries()) {
    const { data: sessData, error: sessErr } = await admin
      .from("sessions")
      .insert({
        week_id: weekId,
        day_of_week: s.day_of_week,
        discipline: s.discipline,
        title: s.title,
        volume_value: s.volume_value,
        volume_unit: "time",
        notes: s.notes,
        sort_order: i,
        route_id: validRoutes.has(s.route_id ?? "") ? s.route_id : null,
        route_note: s.route_note ?? null,
      })
      .select("id")
      .single();
    if (sessErr || !sessData) throw new Error(`Creazione sessione fallita: ${sessErr?.message}`);
    const sessionId = (sessData as { id: string }).id;
    await insertSessionSteps(admin, sessionId, s.steps, true);
  }
}

// ---------------------------------------------------------------- API alto livello

export interface PlanRunResult {
  ok: boolean;
  weeks: number;
  message?: string;
  error?: string;
}

/** Segna l'inizio di una generazione (lock) e azzera l'ultimo errore. */
async function markStart(admin: SupabaseClient, athleteId: string): Promise<void> {
  await admin
    .from("ai_athlete_profiles")
    .update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null })
    .eq("athlete_id", athleteId);
}

async function markEnd(admin: SupabaseClient, athleteId: string, error?: string): Promise<void> {
  await admin
    .from("ai_athlete_profiles")
    .update({ ai_generation_started_at: null, ai_last_error: error ?? null })
    .eq("athlete_id", athleteId);
}

/**
 * Piano iniziale post-onboarding (o revisione su richiesta): razionale macro
 * + settimana ponte + 2 settimane. Con `feedback` il piano viene RIVISTO in
 * base al messaggio dell'atleta (es. "oggi 200 km in bici", "anca contratta").
 */
export async function generateInitialPlan(
  athleteId: string,
  opts: { feedback?: string; notify?: boolean } = {},
): Promise<PlanRunResult> {
  const admin = createAdminClient();
  await markStart(admin, athleteId);
  try {
    const res = await generateInitialPlanInner(admin, athleteId, opts.feedback);
    if (res.ok && opts.notify !== false) await notifyPlanUpdated(athleteId, { reason: opts.feedback }).catch(() => null);
    return res;
  } catch (e) {
    await markEnd(admin, athleteId, (e as Error).message);
    return { ok: false, weeks: 0, error: (e as Error).message };
  }
}

/** Il piano in vigore da oggi in avanti, come testo per il prompt di revisione. */
export async function upcomingPlanText(admin: SupabaseClient, athleteId: string): Promise<string> {
  const monday = toISODate(mondayOf(new Date()));
  const { data: wks } = await admin
    .from("training_weeks")
    .select("id, week_start")
    .eq("athlete_id", athleteId)
    .eq("status", "published")
    .gte("week_start", monday)
    .order("week_start");
  const weeks = (wks ?? []) as { id: string; week_start: string }[];
  if (!weeks.length) return "Nessun piano in vigore.";
  const { data: sess } = await admin
    .from("sessions")
    .select("week_id, day_of_week, discipline, title, volume_value")
    .in("week_id", weeks.map((w) => w.id))
    .order("day_of_week");
  const byWeek = new Map<string, string[]>();
  for (const s of (sess ?? []) as {
    week_id: string; day_of_week: number; discipline: string;
    title: string | null; volume_value: string | null;
  }[]) {
    const arr = byWeek.get(s.week_id) ?? [];
    arr.push(`  ${GIORNI[s.day_of_week]}: ${s.discipline} — ${s.title ?? ""} (${s.volume_value ?? "?"})`);
    byWeek.set(s.week_id, arr);
  }
  return weeks
    .map((w) => `Settimana del ${w.week_start}:\n${(byWeek.get(w.id) ?? ["  (vuota)"]).join("\n")}`)
    .join("\n");
}

const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

async function generateInitialPlanInner(
  admin: SupabaseClient,
  athleteId: string,
  feedback?: string,
): Promise<PlanRunResult> {
  const context = await buildContext(admin, athleteId);
  const { data: psData } = await admin
    .from("ai_athlete_profiles")
    .select("plan_start_date, plan_weeks, shadow_plan")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const ps = psData as { plan_start_date: string | null; plan_weeks: number | null; shadow_plan?: boolean } | null;
  // Tabella ombra: anche la settimana in corso, intera, per confrontarla con quello che l'atleta fa davvero.
  const shadow = !!ps?.shadow_plan;
  const todayISO = toISODate(new Date());
  const currentMonday = toISODate(mondayOf(new Date()));
  const nextMonday = toISODate(addDays(mondayOf(new Date()), 7));
  const tomorrow = addDays(new Date(), 1);
  const tomorrowISO = toISODate(tomorrow);
  const tomorrowDow = shadow ? 0 : (tomorrow.getDay() + 6) % 7; // 0=lunedì … 6=domenica

  // Partenza esplicita nel futuro (es. "fresh start dal 26/10"): niente
  // settimana ponte, N settimane piene dal lunedì di quella data.
  const explicitStart = ps?.plan_start_date && ps.plan_start_date > todayISO ? toISODate(mondayOf(ps.plan_start_date)) : null;
  const nWeeks = Math.min(8, Math.max(2, ps?.plan_weeks ?? 2));
  // Settimana ponte: se domani non è lunedì, l'atleta inizia SUBITO con i
  // giorni che restano di questa settimana, non dal lunedì successivo.
  const bridge = shadow || (!explicitStart && tomorrowISO < nextMonday);

  const feedbackBlock = feedback
    ? `

PIANO ATTUALMENTE IN VIGORE (da rivedere):
${await upcomingPlanText(admin, athleteId)}

⚠️ MESSAGGIO DI OGGI DELL'ATLETA (la revisione parte da qui):
"${feedback}"

Rivedi il piano tenendone conto da domani in avanti: adatta carichi, sposta o sostituisci le sedute che non sono più appropriate (es. recupero dopo uno sforzo molto lungo, prudenza su fastidi muscolari finché non rientrano). In "athlete_message" spiega COSA hai cambiato e PERCHÉ.`
    : "";

  const weeksAsk = explicitStart
    ? `${nWeeks} settimane COMPLETE (lunedì-domenica), la prima con week_start ${explicitStart}, poi le successive una dopo l'altra. Costruiscile come un vero blocco: progressione del carico, settimana di scarico se il blocco lo prevede, test nei primi giorni se mancano le soglie, e per ogni seduta outdoor un percorso del catalogo quando è adatto.`
    : shadow
      ? `TRE settimane COMPLETE (lunedì-domenica): week_start ${currentMonday} (la settimana in corso, intera: è una tabella ombra di confronto, quindi anche i giorni già passati), poi ${nextMonday} e la successiva.`
    : bridge
      ? `TRE settimane. La prima è la SETTIMANA PONTE con week_start ${currentMonday}: SOLO sedute da ${GIORNI[tomorrowDow]} (day_of_week ${tomorrowDow}) a domenica, per partire subito con carico prudente di avvio. Poi le due settimane complete: week_start ${nextMonday} e la successiva.`
      : `le PRIME DUE settimane complete, la prima con week_start ${nextMonday}, la seconda quella successiva.`;

  const res = await generateStructured<AiPlan>({
    system: SYSTEM + (await langNote(admin, athleteId)),
    prompt: `${context}${feedbackBlock}

RICHIESTA: costruisci il piano per questo atleta. ${
      explicitStart
        ? `L'atleta INIZIA LUNEDÌ ${explicitStart} (fresh start: ignora la settimana corrente).`
        : `L'atleta vuole INIZIARE DOMANI (${GIORNI[tomorrowDow]} ${tomorrowISO}).`
    }
1. "rationale": la periodizzazione completa fino alle gare obiettivo (blocchi, logica, test previsti), scritta per l'atleta.
2. "weeks": ${weeksAsk} Rispetta i giorni/ore disponibili e i vincoli fissi.
3. "athlete_message": messaggio di benvenuto e di lancio del piano.`,
    schema: PLAN_SCHEMA as unknown as Record<string, unknown>,
  });

  if (!res.ok || !res.data) {
    await markEnd(admin, athleteId, res.error ?? "Generazione fallita");
    return { ok: false, weeks: 0, error: res.error };
  }

  const plan = sanitizePlan(res.data, await loadCaps(admin, athleteId));
  // Guard-rail settimana ponte: mai sedute su giorni già passati (o oggi).
  for (const w of plan.weeks) {
    if (w.week_start === currentMonday) {
      w.sessions = w.sessions.filter((s) => s.day_of_week >= tomorrowDow);
    }
  }

  for (const w of plan.weeks) await writeWeek(admin, athleteId, w);

  await admin
    .from("ai_athlete_profiles")
    .update({
      plan_generated_at: new Date().toISOString(),
      ai_rationale: plan.rationale,
      ai_generation_started_at: null,
      ai_last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("athlete_id", athleteId);

  return { ok: true, weeks: plan.weeks.length, message: plan.athlete_message };
}

/** Tetti di disponibilità dell'atleta per i guard-rail del piano. */
async function loadCaps(admin: SupabaseClient, athleteId: string): Promise<PlanCaps> {
  const { data } = await admin
    .from("ai_athlete_profiles")
    .select("availability_hours, weekday_minutes_max, weekend_hours_max")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const r = (data ?? {}) as Partial<PlanCaps>;
  return {
    availability_hours: r.availability_hours ?? null,
    weekday_minutes_max: r.weekday_minutes_max ?? null,
    weekend_hours_max: r.weekend_hours_max ?? null,
  };
}

/** Attività reali della settimana (da Intervals), una riga per attività. */
async function weekActivitiesText(
  admin: SupabaseClient,
  athleteId: string,
  mondayISO: string,
  sundayISO: string,
): Promise<string> {
  const { data } = await admin
    .from("icu_activities")
    .select(
      "name, sport_type, start_date, distance_m, moving_time_s, total_elevation_gain, average_heartrate, max_heartrate, training_load",
    ).eq("is_duplicate" as never, false as never)
    .eq("athlete_id", athleteId)
    .gte("start_date", `${mondayISO}T00:00:00`)
    .lte("start_date", `${sundayISO}T23:59:59`)
    .order("start_date");
  const acts = (data ?? []) as {
    name: string | null; sport_type: string | null; start_date: string | null;
    distance_m: number | null; moving_time_s: number | null; total_elevation_gain: number | null;
    average_heartrate: number | null; max_heartrate: number | null; training_load: number | null;
  }[];
  if (!acts.length) return "nessuna attività registrata questa settimana";
  return acts
    .map((a) => {
      const d = a.start_date ? new Date(a.start_date) : null;
      const dow = d ? GIORNI[(d.getDay() + 6) % 7] : "?";
      const km = a.distance_m ? ` ${(a.distance_m / 1000).toFixed(1)}km` : "";
      const el = a.total_elevation_gain && a.total_elevation_gain > 30 ? ` D+${Math.round(a.total_elevation_gain)}` : "";
      const hr = a.average_heartrate ? ` FC ${Math.round(a.average_heartrate)}${a.max_heartrate ? `/${Math.round(a.max_heartrate)}max` : ""}` : "";
      const tl = a.training_load ? ` load ${Math.round(a.training_load)}` : "";
      return `  ${dow}: ${a.sport_type ?? "?"} ${a.name ?? ""} ${fmtVolume(a.moving_time_s ?? 0)}${km}${el}${hr}${tl}`;
    })
    .join("\n");
}

/**
 * Revisione settimanale (cron della domenica pomeriggio, o forced refresh
 * dall'atleta): sincronizza le attività da Intervals, legge pianificato vs
 * svolto (log + attività reali + RPE), i desideri/disponibilità dichiarati per
 * la settimana successiva e genera la settimana successiva.
 * `opts.note`: messaggio del forced refresh (desideri/disponibilità).
 */
export async function weeklyReview(
  athleteId: string,
  opts: { note?: string } = {},
): Promise<PlanRunResult> {
  const admin = createAdminClient();
  await admin
    .from("ai_athlete_profiles")
    .update({
      review_requested_at: new Date().toISOString(),
      ai_generation_started_at: new Date().toISOString(),
      ai_last_error: null,
    })
    .eq("athlete_id", athleteId);
  try {
    // Tabella ombra: la revisione rifà il blocco dalla settimana in corso (non solo la prossima).
    const { data: sh } = await admin.from("ai_athlete_profiles").select("shadow_plan").eq("athlete_id", athleteId).maybeSingle();
    if ((sh as { shadow_plan?: boolean } | null)?.shadow_plan) {
      const r = await generateInitialPlanInner(admin, athleteId, opts.note);
      return r;
    }
    const res = await weeklyReviewInner(admin, athleteId, opts.note);
    if (res.ok) await notifyPlanUpdated(athleteId, { reason: opts.note }).catch(() => null);
    return res;
  } catch (e) {
    await admin
      .from("ai_athlete_profiles")
      .update({ review_requested_at: null, ai_generation_started_at: null, ai_last_error: (e as Error).message })
      .eq("athlete_id", athleteId);
    return { ok: false, weeks: 0, error: (e as Error).message };
  }
}

async function weeklyReviewInner(
  admin: SupabaseClient,
  athleteId: string,
  note?: string,
): Promise<PlanRunResult> {
  // 1) Attività fresche da Intervals (best-effort: senza connessione si va
  //    avanti con quello che c'è).
  try {
    const conn = await loadIntervalsConnection(admin as never, athleteId);
    if (conn) {
      await syncIcuActivities(admin as never, athleteId, conn, 14);
      await syncTracks(admin, athleteId, conn, { days: 400, limit: 25 });
      await rebuildRouteCatalog(admin, athleteId);
    }
  } catch (e) {
    console.error("[weekly] sync Intervals fallito", (e as Error).message);
  }

  // 2) Desideri/disponibilità per la prossima settimana (non ancora consumati).
  const { data: wishData } = await admin
    .from("ai_feedback")
    .select("id, message, created_at")
    .eq("athlete_id", athleteId)
    .eq("kind", "next_week")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(3);
  const wishes = (wishData ?? []) as { id: string; message: string; created_at: string }[];

  const context = await buildContext(admin, athleteId);

  const thisMonday = mondayOf(new Date());
  const thisMondayISO = toISODate(thisMonday);
  const thisSundayISO = toISODate(addDays(thisMonday, 6));
  const nextMondayISO = toISODate(addDays(thisMonday, 7));

  // 3) Settimana corrente pianificata + esito (svolto/RPE).
  const { data: wkData } = await admin
    .from("training_weeks")
    .select("id, coach_comment")
    .eq("athlete_id", athleteId)
    .eq("week_start", thisMondayISO)
    .maybeSingle();
  let plannedText = "Nessuna settimana pianificata.";
  if (wkData) {
    const weekId = (wkData as { id: string }).id;
    const { data: sess } = await admin
      .from("sessions")
      .select("id, day_of_week, discipline, title, volume_value")
      .eq("week_id", weekId)
      .order("day_of_week");
    const ids = ((sess ?? []) as { id: string }[]).map((s) => s.id);
    const { data: logs } = ids.length
      ? await admin
          .from("session_logs")
          .select("session_id, status, rpe_actual, athlete_note")
          .eq("athlete_id", athleteId)
          .in("session_id", ids)
      : { data: [] };
    const logBySession = new Map(
      ((logs ?? []) as {
        session_id: string; status: string; rpe_actual: number | null; athlete_note: string | null;
      }[]).map((l) => [l.session_id, l]),
    );
    plannedText = ((sess ?? []) as {
      id: string; day_of_week: number; discipline: string;
      title: string | null; volume_value: string | null;
    }[])
      .map((s) => {
        const log = logBySession.get(s.id);
        const done = log?.status === "completed" ? "SVOLTO" : "non svolto";
        const rpe = log?.rpe_actual != null ? ` RPE ${log.rpe_actual}/10` : "";
        const fb = log?.athlete_note ? ` — "${log.athlete_note}"` : "";
        return `  ${GIORNI[s.day_of_week]}: ${s.discipline} ${s.title ?? ""} ${s.volume_value ?? ""} → ${done}${rpe}${fb}`;
      })
      .join("\n");
  }
  const actualText = await weekActivitiesText(admin, athleteId, thisMondayISO, thisSundayISO);

  const { data: aiProfData } = await admin
    .from("ai_athlete_profiles")
    .select("ai_rationale")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const aiProf = aiProfData as { ai_rationale: string | null } | null;

  const wishesBlock = wishes.length || note
    ? `\nDESIDERI E DISPONIBILITÀ DELL'ATLETA PER LA PROSSIMA SETTIMANA (hanno la precedenza sulla disponibilità standard, entro i limiti di sicurezza):\n${[
        ...(note ? [`  [adesso] ${note}`] : []),
        ...wishes.map((w) => `  [${w.created_at.slice(0, 10)}] ${w.message}`),
      ].join("\n")}\n`
    : "";

  const res = await generateStructured<AiPlan>({
    system: SYSTEM + (await langNote(admin, athleteId)),
    prompt: `${context}

PIANO MACRO CORRENTE (tuo, dalle settimane precedenti):
${aiProf?.ai_rationale ?? "non ancora definito"}

SETTIMANA CORRENTE (${thisMondayISO} → ${thisSundayISO}) — PIANIFICATO vs ESITO DICHIARATO:
${plannedText}

ATTIVITÀ REALMENTE REGISTRATE QUESTA SETTIMANA (Garmin/Strava via Intervals — fanno fede sul pianificato):
${actualText}
${wishesBlock}
RICHIESTA: revisione settimanale da coach${note ? " (richiesta ora dall'atleta)" : " (domenica pomeriggio)"}.
1. Confronta pianificato e attività reali: aderenza, volume, dislivello, FC, RPE, segnali di affaticamento. Se ha fatto di più o di diverso (es. una gara, un lungo non previsto), parti da lì.
2. "weeks": UNA sola settimana, week_start ${nextMondayISO}, adattata di conseguenza (se ha saltato molto o RPE altissimi → riduci; se tutto facile → progredisci con prudenza; se ha espresso desideri/disponibilità per la settimana, rispettali).
3. "rationale": macro-piano aggiornato (o invariato se va bene così), con il blocco in corso e le prossime tappe.
4. "athlete_message": feedback personale e onesto sulla settimana svolta (numeri reali) + cosa guardare nella prossima (3-5 frasi).`,
    schema: PLAN_SCHEMA as unknown as Record<string, unknown>,
  });

  if (!res.ok || !res.data) {
    await admin
      .from("ai_athlete_profiles")
      .update({ review_requested_at: null, ai_generation_started_at: null, ai_last_error: res.error ?? "Revisione fallita" })
      .eq("athlete_id", athleteId);
    return { ok: false, weeks: 0, error: res.error };
  }

  const plan = sanitizePlan(res.data, await loadCaps(admin, athleteId));
  for (const w of plan.weeks) await writeWeek(admin, athleteId, w);

  if (wishes.length) {
    await admin
      .from("ai_feedback")
      .update({ consumed_at: new Date().toISOString() })
      .in("id", wishes.map((w) => w.id));
  }

  await admin
    .from("ai_athlete_profiles")
    .update({
      last_review_at: new Date().toISOString(),
      review_requested_at: null,
      ai_generation_started_at: null,
      ai_rationale: plan.rationale,
      ai_last_message: plan.athlete_message,
      updated_at: new Date().toISOString(),
    })
    .eq("athlete_id", athleteId);

  return { ok: true, weeks: plan.weeks.length, message: plan.athlete_message };
}

/** Atleti dell'app AI con onboarding completato (per il cron settimanale). */
export async function listAiAthletes(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_athlete_profiles")
    .select("athlete_id")
    .not("onboarding_completed_at", "is", null);
  return ((data ?? []) as { athlete_id: string }[]).map((r) => r.athlete_id);
}
