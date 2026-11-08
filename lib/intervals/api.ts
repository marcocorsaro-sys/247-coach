// ============================================================================
// Client minimale dell'API Intervals.icu (https://intervals.icu/api-docs.html).
// Serve a pubblicare allenamenti PIANIFICATI sul calendario dell'atleta; se
// l'atleta ha abilitato "Upload planned workouts" su Intervals, questi vengono
// sincronizzati su Garmin Connect e quindi sull'orologio.
//
// Autenticazione: HTTP Basic con username fisso "API_KEY" e password = la API
// key personale dell'atleta (Intervals → Settings → Developer). Nessuna chiave
// a livello di app.
// ============================================================================

const BASE = "https://intervals.icu/api/v1";

export interface IntervalsConn {
  intervals_athlete_id: string | null; // es. "i123456"
  api_key: string;
}

export interface IntervalsResult {
  ok: boolean;
  status: number;
  detail?: string;
  data?: unknown;
}

function authHeader(apiKey: string): string {
  // Basic base64("API_KEY:<key>")
  return "Basic " + Buffer.from(`API_KEY:${apiKey}`).toString("base64");
}

/** Normalizza l'athlete id: accetta "i123456" o "123456"; default "0" (= me). */
function athleteId(conn: IntervalsConn): string {
  const raw = (conn.intervals_athlete_id ?? "").trim();
  if (!raw) return "0";
  return raw.startsWith("i") ? raw : `i${raw}`;
}

/** Verifica la connessione: legge il profilo atleta. */
export async function verifyIntervals(conn: IntervalsConn): Promise<IntervalsResult> {
  if (!conn.api_key?.trim()) return { ok: false, status: 0, detail: "API key mancante" };
  try {
    const res = await fetch(`${BASE}/athlete/${athleteId(conn)}/profile`, {
      headers: { Authorization: authHeader(conn.api_key) },
    });
    if (!res.ok) {
      return { ok: false, status: res.status, detail: await res.text() };
    }
    return { ok: true, status: res.status, data: await res.json() };
  } catch (e) {
    return { ok: false, status: 0, detail: (e as Error).message };
  }
}

/** Foto profilo dell'atleta su Intervals (profile_medium), se presente. */
export function profilePhotoUrl(profileData: unknown): string | null {
  const d = profileData as { athlete?: { profile_medium?: string }; profile_medium?: string } | null;
  const u = d?.athlete?.profile_medium ?? d?.profile_medium ?? null;
  return typeof u === "string" && u.startsWith("http") ? u : null;
}

export interface IntervalsEvent {
  /**
   * Identificativo esterno per l'upsert idempotente (nostro session id).
   * Viene inviato sia come `uid` (è il campo su cui upsertOnUid=true fa
   * match) sia come `external_id` (riferimento nostro).
   */
  external_id?: string;
  name: string;
  /** "Run" | "Ride" | "Swim" | "Workout" ... (tipo attività Intervals). */
  type: string;
  /** ISO locale "YYYY-MM-DDTHH:mm:ss". */
  start_date_local: string;
  /** Testo/descrizione del workout (sintassi a step Intervals con target assoluti). */
  description?: string;
  /** Documento strutturato del workout (alternativa alla description). */
  workout_doc?: unknown;
}

/**
 * Attività svolte dell'atleta nell'intervallo di date (ISO yyyy-mm-dd),
 * qualunque sia la piattaforma d'origine collegata a Intervals (Garmin, Polar,
 * Suunto, Strava, ...). Restituisce il JSON grezzo: il mapping ai nostri campi
 * è difensivo e sta in lib/server/icuSync.
 */
export async function listActivities(
  conn: IntervalsConn,
  oldest: string,
  newest: string,
): Promise<IntervalsResult> {
  if (!conn.api_key?.trim()) return { ok: false, status: 0, detail: "API key mancante" };
  try {
    const res = await fetch(
      `${BASE}/athlete/${athleteId(conn)}/activities?oldest=${oldest}&newest=${newest}`,
      { headers: { Authorization: authHeader(conn.api_key) } },
    );
    if (!res.ok) return { ok: false, status: res.status, detail: await res.text() };
    return { ok: true, status: res.status, data: await res.json() };
  } catch (e) {
    return { ok: false, status: 0, detail: (e as Error).message };
  }
}

/** Evento del calendario Intervals come tornato dall'API (campi che ci servono). */
export interface IntervalsCalendarEvent {
  id: number;
  uid: string | null;
  external_id: string | null;
  category: string | null;
  name: string | null;
  start_date_local: string | null;
}

/**
 * Eventi del calendario dell'atleta nell'intervallo di date (ISO yyyy-mm-dd).
 * NB: la rotta di lista è /events.json (path param {format} nello spec:
 * /events senza estensione NON esiste e risponde errore).
 */
export async function listEvents(
  conn: IntervalsConn,
  oldest: string,
  newest: string,
): Promise<IntervalsResult> {
  if (!conn.api_key?.trim()) return { ok: false, status: 0, detail: "API key mancante" };
  try {
    const res = await fetch(
      `${BASE}/athlete/${athleteId(conn)}/events.json?oldest=${oldest}&newest=${newest}&category=WORKOUT&limit=1000`,
      { headers: { Authorization: authHeader(conn.api_key) } },
    );
    if (!res.ok) return { ok: false, status: res.status, detail: await res.text() };
    return { ok: true, status: res.status, data: await res.json() };
  } catch (e) {
    return { ok: false, status: 0, detail: (e as Error).message };
  }
}

/** Elimina un evento dal calendario dell'atleta (per la bonifica dei duplicati). */
export async function deleteEvent(
  conn: IntervalsConn,
  eventId: number,
): Promise<IntervalsResult> {
  if (!conn.api_key?.trim()) return { ok: false, status: 0, detail: "API key mancante" };
  try {
    const res = await fetch(`${BASE}/athlete/${athleteId(conn)}/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: authHeader(conn.api_key) },
    });
    if (!res.ok) return { ok: false, status: res.status, detail: await res.text() };
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, detail: (e as Error).message };
  }
}

function eventBody(event: IntervalsEvent): Record<string, unknown> {
  const body: Record<string, unknown> = {
    category: "WORKOUT",
    name: event.name,
    type: event.type,
    start_date_local: event.start_date_local,
  };
  if (event.external_id) body.external_id = event.external_id;
  // Anche la stringa VUOTA va inviata: quando la seduta viaggia come
  // documento strutturato la descrizione va AZZERATA, altrimenti resta quella
  // del push precedente e col tempo racconta un allenamento diverso da quello
  // che l'atleta ha davvero sull'orologio.
  if (event.description != null) body.description = event.description;
  if (event.workout_doc) body.workout_doc = event.workout_doc;
  return body;
}

/**
 * Crea un allenamento pianificato sul calendario dell'atleta.
 * ATTENZIONE: l'upsert va fatto da NOI per external_id (lista → PUT/POST):
 * Intervals ignora un `uid` fornito dal client e ne genera uno proprio, quindi
 * upsertOnUid non aggancia mai i nostri eventi (verificato sul calendario di
 * Marco: stesse external_id, uid tutti diversi → duplicati a ogni push).
 */
export async function createWorkoutEvent(
  conn: IntervalsConn,
  event: IntervalsEvent,
): Promise<IntervalsResult> {
  if (!conn.api_key?.trim()) return { ok: false, status: 0, detail: "API key mancante" };
  try {
    const res = await fetch(`${BASE}/athlete/${athleteId(conn)}/events`, {
      method: "POST",
      headers: {
        Authorization: authHeader(conn.api_key),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody(event)),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, detail: await res.text() };
    }
    return { ok: true, status: res.status, data: await res.json().catch(() => null) };
  } catch (e) {
    return { ok: false, status: 0, detail: (e as Error).message };
  }
}

/** Aggiorna un evento esistente (PUT): è il ramo "update" del nostro upsert. */
export async function updateWorkoutEvent(
  conn: IntervalsConn,
  eventId: number,
  event: IntervalsEvent,
): Promise<IntervalsResult> {
  if (!conn.api_key?.trim()) return { ok: false, status: 0, detail: "API key mancante" };
  try {
    const res = await fetch(`${BASE}/athlete/${athleteId(conn)}/events/${eventId}`, {
      method: "PUT",
      headers: {
        Authorization: authHeader(conn.api_key),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody(event)),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, detail: await res.text() };
    }
    return { ok: true, status: res.status, data: await res.json().catch(() => null) };
  } catch (e) {
    return { ok: false, status: 0, detail: (e as Error).message };
  }
}

/**
 * Traccia GPS di un'attività: bounds + lista di [lat,lng] (con null nei
 * tratti senza fix). Usata per il catalogo dei percorsi abituali.
 */
export async function getActivityMap(
  conn: IntervalsConn,
  activityId: string,
): Promise<{ bounds: [number, number][] | null; latlngs: ([number, number] | null)[] } | null> {
  try {
    const res = await fetch(`${BASE}/activity/${activityId}/map`, {
      headers: { Authorization: authHeader(conn.api_key) },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { bounds?: [number, number][]; latlngs?: ([number, number] | null)[] };
    if (!j.latlngs) return null;
    return { bounds: j.bounds ?? null, latlngs: j.latlngs };
  } catch {
    return null;
  }
}
