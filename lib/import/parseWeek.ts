import * as XLSX from "xlsx";

// ============================================================================
// Parser delle tabelle Excel di Irene.
// Struttura di un foglio-settimana (1-indexed):
//   riga 1: A1 email coach, D1 nome atleta
//   riga 2: A2 mese/anno, C2..I2 giorni (lun..dom)
//   bande disciplina lungo la colonna A:
//     swim  @ riga r  -> r=tipo, r+1=volume, r+2=testo seduta   (3 righe)
//     bike  @ riga r  -> idem
//     run   @ riga r  -> idem
//     athletics @ riga r -> r=volume, r+1=testo                  (2 righe)
//     comment   @ riga r -> nota di giornata                     (1 riga)
// Le colonne C..I (indici 2..8) sono i 7 giorni (0 = lunedì).
// ============================================================================

export type ParsedSession = {
  day_of_week: number;
  discipline: "swim" | "bike" | "run" | "athletics";
  title: string | null;
  volume_value: string | null;
  volume_unit: "time" | "distance" | "other" | null;
  raw_text: string | null;
};

/** Riga con del contenuto che nessuna banda ha letto. `row` è 1-based. */
export type DroppedRow = { label: string; days: number; row: number };

export type ParsedWeek = {
  sheetName: string;
  label: string | null;
  weekStart: string | null; // ISO yyyy-mm-dd
  athleteName: string | null;
  sessions: ParsedSession[];
  /** Righe piene che il parser non ha saputo leggere: vanno DETTE, non perse. */
  dropped: DroppedRow[];
  /** Blocchi letti per posizione perché l'etichetta mancava: da dire, non da nascondere. */
  assumed: string[];
};

// Le etichette in colonna A. Il foglio nasce da un modello che Irene copia e
// adatta, quindi la stessa riga si chiama "SWIM" su una tabella e "NUOTO" su
// quella dopo: il parser accetta entrambe le lingue e le varianti più comuni.
// Se non riconosce un'etichetta la riga finisce in `dropped`, mai nel nulla.
const BANDS: {
  labels: string[];
  disc: ParsedSession["discipline"];
  rows: 2 | 3;
}[] = [
  { labels: ["swim", "swimming", "nuoto", "nuotata"], disc: "swim", rows: 3 },
  {
    labels: ["bike", "biking", "cycling", "bici", "bicicletta", "ciclismo"],
    disc: "bike",
    rows: 3,
  },
  { labels: ["run", "running", "corsa", "podismo"], disc: "run", rows: 3 },
  {
    labels: [
      "athletics",
      "athletic",
      "strength",
      "forza",
      "gym",
      "palestra",
      "atletica",
    ],
    disc: "athletics",
    rows: 2,
  },
];

// Oltre alle bande di disciplina Irene usa una riga di commento per le note di
// giornata ("SOLO GYM", "SESSIONE DI GYM"). Finora quell'etichetta non era fra
// quelle riconosciute e la riga veniva scartata senza dirlo a nessuno.
const COMMENT_LABELS = new Set([
  "comment",
  "comments",
  "commento",
  "commenti",
  "nota",
  "note",
  "notes",
]);

/**
 * Riduce l'etichetta di colonna A alle sole lettere minuscole senza accenti:
 * "SWIM ", "Swim:", "NUOTO." e "nuòto" diventano la stessa cosa. Serve perché
 * nei fogli veri l'etichetta arriva con due punti, spazi o maiuscole a caso, e
 * un confronto letterale la farebbe cadere in silenzio.
 */
function normalizeLabel(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const MONTHS: Record<string, number> = {
  gennaio: 0,
  febbraio: 1,
  marzo: 2,
  aprile: 3,
  maggio: 4,
  giugno: 5,
  luglio: 6,
  agosto: 7,
  settembre: 8,
  ottobre: 9,
  novembre: 10,
  dicembre: 11,
};

const DAY_COLS = [2, 3, 4, 5, 6, 7, 8]; // C..I -> giorno 0..6

/** Area davvero occupata da celle, ignorando il `!ref` dichiarato dal foglio. */
function usedRange(ws: XLSX.WorkSheet): XLSX.Range {
  let maxR = 0;
  let maxC = 0;
  for (const key of Object.keys(ws)) {
    if (key[0] === "!") continue;
    const { r, c } = XLSX.utils.decode_cell(key);
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } };
}

function cell(aoa: unknown[][], r: number, c: number): string | null {
  const v = aoa[r]?.[c];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function detectUnit(vol: string | null): ParsedSession["volume_unit"] {
  if (!vol) return null;
  const v = vol.toLowerCase();
  if (v.includes("km") || v.includes("mt")) return "distance";
  if (v.includes("h") || v.includes("'") || v.includes("’") || v.includes("min"))
    return "time";
  return "other";
}

/**
 * Le note di giornata finiscono nel testo della riga forza: è lì che Irene le
 * scrive nel foglio ed è lì che si aspetta di rileggerle in app. Se quel giorno
 * la forza non c'è, la riga viene creata: meglio una riga in più da cancellare
 * che una nota persa in silenzio, che è il difetto che stiamo correggendo.
 */
function attachDayNotes(
  sessions: ParsedSession[],
  dayNotes: (string | null)[],
): void {
  dayNotes.forEach((note, day) => {
    if (!note) return;
    const ath = sessions.find(
      (s) => s.day_of_week === day && s.discipline === "athletics",
    );
    if (ath) {
      ath.raw_text = ath.raw_text ? `${ath.raw_text} · ${note}` : note;
      return;
    }
    sessions.push({
      day_of_week: day,
      discipline: "athletics",
      title: "Forza",
      volume_value: null,
      volume_unit: null,
      raw_text: note,
    });
  });
}

const HEADER_ROWS = 2; // riga 1 = email/atleta, riga 2 = mese e giorni

/**
 * Il blocco nuoto senza etichetta.
 *
 * Nel modello di Irene la prima banda sotto l'intestazione è sempre il nuoto,
 * con "swim" in una cella unita A3:A5. Nelle tabelle di Marco quella cella
 * si è svuotata (unione persa, etichetta sparita) mentre bike, run e
 * athletics erano al loro posto: le tre righe restavano, con dentro
 * "12.30-13:30 Nuoto di gruppo", e il parser le saltava perché non sapeva
 * di cosa fossero.
 *
 * Regola: se fra l'intestazione e la prima banda etichettata ci sono
 * esattamente le tre righe di una banda, e quella prima banda non è il
 * nuoto, le tre righe SONO il nuoto. Si legge, e si dice.
 */
function inferSwimBand(aoa: unknown[][]): number | null {
  for (let ri = HEADER_ROWS; ri < aoa.length; ri++) {
    const label = normalizeLabel(aoa[ri]?.[0]);
    const band = BANDS.find((b) => b.labels.includes(label));
    if (!band && !COMMENT_LABELS.has(label)) continue;
    if (band?.disc === "swim") return null; // c'è, niente da dedurre
    return ri - HEADER_ROWS === 3 ? HEADER_ROWS : null;
  }
  return null;
}

function parseSheet(aoa: unknown[][]): {
  sessions: ParsedSession[];
  dropped: DroppedRow[];
  assumed: string[];
} {
  const out: ParsedSession[] = [];
  const dropped: DroppedRow[] = [];
  const assumed: string[] = [];
  const dayNotes: (string | null)[] = DAY_COLS.map(() => null);
  // Righe "consumate" da una banda: la banda nuoto occupa anche le due righe
  // sotto, che non hanno etichetta e non vanno segnalate come scartate.
  const claimed = new Set<number>();

  const swimAt = inferSwimBand(aoa);

  for (let ri = 0; ri < aoa.length; ri++) {
    let label = normalizeLabel(aoa[ri]?.[0]);
    if (ri === swimAt && !label) {
      label = "swim";
      const hasContent = [0, 1, 2].some((k) =>
        DAY_COLS.some((c) => cell(aoa, ri + k, c)),
      );
      if (hasContent) {
        assumed.push(
          `righe ${ri + 1}-${ri + 3} lette come nuoto (manca l'etichetta in A${ri + 1})`,
        );
      }
    }

    if (COMMENT_LABELS.has(label)) {
      claimed.add(ri);
      for (const c of DAY_COLS) {
        const v = cell(aoa, ri, c);
        if (!v) continue;
        const day = c - 2;
        dayNotes[day] = dayNotes[day] ? `${dayNotes[day]} · ${v}` : v;
      }
      continue;
    }

    const band = BANDS.find((b) => b.labels.includes(label));
    if (!band) continue;

    const typeRow = band.rows === 3 ? ri : -1;
    const volRow = band.rows === 3 ? ri + 1 : ri;
    const detailRow = band.rows === 3 ? ri + 2 : ri + 1;
    for (let k = ri; k <= detailRow; k++) claimed.add(k);

    for (const c of DAY_COLS) {
      const type = typeRow >= 0 ? cell(aoa, typeRow, c) : null;
      const vol = cell(aoa, volRow, c);
      const detail = cell(aoa, detailRow, c);
      if (!type && !vol && !detail) continue;

      out.push({
        day_of_week: c - 2,
        discipline: band.disc,
        title:
          type ?? (band.disc === "athletics" ? (detail ?? "Mobilità") : null),
        volume_value: vol,
        volume_unit: detectUnit(vol),
        raw_text: band.disc === "athletics" ? null : detail,
      });
    }
  }
  attachDayNotes(out, dayNotes);

  // Secondo giro: tutto quello che nessuna banda ha letto.
  //
  // Non basta guardare le righe con un'etichetta sconosciuta. Una banda è
  // alta tre righe — tipo, volume, testo — e la riga con l'etichetta può
  // essere vuota mentre il contenuto sta in quelle sotto: se l'etichetta non
  // viene riconosciuta, o se la coach aggiunge una quarta riga al blocco, il
  // testo se ne va senza che nemmeno l'avviso se ne accorga. È il caso di
  // Irene: "nel nuoto non mi carica la frase che avevo scritto".
  //
  // Quindi: ogni riga con del contenuto nei giorni che nessuno ha letto viene
  // riportata. Le righe adiacenti si accorpano in una segnalazione sola, così
  // un blocco di tre righe non diventa tre avvisi.
  let run: { label: string; days: number; from: number } | null = null;
  const flush = () => {
    if (run) dropped.push({ label: run.label, days: run.days, row: run.from + 1 });
    run = null;
  };
  for (let ri = 2; ri < aoa.length; ri++) {
    // righe 1-2 = intestazione (email, atleta, mese, giorni): mai "perse"
    if (claimed.has(ri)) {
      flush();
      continue;
    }
    const days = DAY_COLS.filter((c) => cell(aoa, ri, c)).length;
    if (days === 0) {
      flush();
      continue;
    }
    let raw = String(aoa[ri]?.[0] ?? "").trim();
    if (!run && !raw) {
      // L'etichetta del blocco può stare una o due righe più su, su una riga
      // senza contenuto nei giorni: è il caso tipico del nuoto, dove la riga
      // "NUOTO" porta solo il nome e il testo sta due righe sotto. Senza
      // questo, l'avviso direbbe "riga 4" e basta.
      for (let k = ri - 1; k >= 2 && k >= ri - 2 && !claimed.has(k); k--) {
        const up = String(aoa[k]?.[0] ?? "").trim();
        if (up) {
          raw = up;
          break;
        }
      }
    }
    if (run) {
      run.days = Math.max(run.days, days);
      if (!run.label && raw) run.label = raw;
    } else {
      run = { label: raw, days, from: ri };
    }
  }
  flush();

  return { sessions: out, dropped, assumed };
}

/** Estrae il primo nome di mese (0-11) trovato in un testo, o null. */
function monthFromText(text: string | null): number | null {
  if (!text) return null;
  for (const t of text.toLowerCase().split(/[_\s]+/)) {
    if (t in MONTHS) return MONTHS[t];
  }
  return null;
}

/** Estrae un anno a 4 cifre da un testo, o null. */
function yearFromText(text: string | null): number | null {
  if (!text) return null;
  for (const t of text.toLowerCase().split(/[_\s]+/)) {
    if (/^\d{4}$/.test(t)) return parseInt(t, 10);
  }
  return null;
}

/** Numeri giorno-del-mese dalle colonne C..I della riga 2 (es. "Mo 08" -> 8). */
function headerDayNumbers(aoa: unknown[][]): (number | null)[] {
  return DAY_COLS.map((c) => {
    const m = cell(aoa, 1, c)?.match(/(\d{1,2})/);
    return m ? parseInt(m[1], 10) : null;
  });
}

/** Quanti dei 7 giorni a partire da `monday` (UTC) cadono nel mese `month`. */
function daysInMonth(monday: Date, month: number): number {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 86_400_000);
    if (d.getUTCMonth() === month) n++;
  }
  return n;
}

/**
 * Verifica che la settimana che inizia con `monday` (UTC) riproduca i numeri
 * giorno dell'intestazione: per ogni colonna nota, il giorno-del-mese combacia.
 */
function weekMatches(monday: Date, dayNums: (number | null)[]): boolean {
  let checked = 0;
  for (let i = 0; i < 7; i++) {
    const want = dayNums[i];
    if (want == null) continue;
    const d = new Date(monday.getTime() + i * 86_400_000);
    if (d.getUTCDate() !== want) return false;
    checked++;
  }
  return checked >= 2; // servono almeno un paio di colonne per fidarsi
}

/**
 * Deriva l'inizio settimana (lunedì ISO) in modo robusto.
 *
 * Le tabelle di Irene hanno due insidie:
 *  - settimane a cavallo di due mesi (es. foglio "Luglio_1" con lunedì 29/06);
 *  - l'etichetta mese in A2 a volte non è aggiornata (es. foglio "Dicembre_1"
 *    con A2 ancora "Novembre_2025").
 *
 * Strategia: si prende il mese dal NOME DEL FOGLIO (intenzionale) con fallback
 * su A2, l'anno da A2/foglio, e si individua il vero lunedì verificando che la
 * sequenza dei numeri-giorno dell'intestazione combaci col calendario. Così i
 * cavalli di mese e le etichette stantie si risolvono da soli.
 */
function deriveWeek(
  aoa: unknown[][],
  sheetName: string,
): { label: string | null; weekStart: string | null } {
  const a2 = cell(aoa, 1, 0); // etichetta mese/anno
  const month = monthFromText(sheetName) ?? monthFromText(a2);
  const year = yearFromText(a2) ?? yearFromText(sheetName);
  const dayNums = headerDayNumbers(aoa);
  const d0 = dayNums[0];

  if (month != null && year != null && d0 != null) {
    // Candidati lunedì attorno al mese/anno indicato; la verifica del
    // calendario scarta da sé quelli sbagliati (incluso il rollover d'anno).
    const seen = new Map<string, Date>();
    for (const yy of [year - 1, year, year + 1]) {
      for (const mm of [month - 1, month, month + 1]) {
        const monday = new Date(Date.UTC(yy, mm, d0));
        if (monday.getUTCDay() !== 1) continue; // 1 = lunedì
        if (!weekMatches(monday, dayNums)) continue;
        seen.set(monday.toISOString().slice(0, 10), monday);
      }
    }
    if (seen.size > 0) {
      // Tra i lunedì validi, scelgo quello la cui settimana ha più giorni nel
      // mese nominato (gestisce i cavalli: "Luglio_1" → settimana con più
      // giorni di luglio).
      const best = [...seen.values()].sort(
        (a, b) => daysInMonth(b, month) - daysInMonth(a, month),
      )[0];
      return { label: a2, weekStart: best.toISOString().slice(0, 10) };
    }
  }

  // Fallback: vecchia logica basata solo su A2 + giorno della colonna C.
  if (month != null && year != null) {
    const day = d0 ?? 1;
    return {
      label: a2,
      weekStart: new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10),
    };
  }
  return { label: a2, weekStart: null };
}

function parseSheetToWeek(
  ws: XLSX.WorkSheet,
  name: string,
): ParsedWeek {
  // Il foglio di Irene dichiara come area usata `A1:J1048576`: senza un
  // limite, sheet_to_json materializza un milione di righe vuote e un file da
  // 29 KB ci mette quasi quaranta secondi. Si legge solo fino all'ultima
  // cella che esiste davvero.
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: null,
    range: usedRange(ws),
  });
  const { sessions, dropped, assumed } = parseSheet(aoa);
  const { label, weekStart } = deriveWeek(aoa, name);
  const athleteName = cell(aoa, 0, 3); // D1
  return { sheetName: name, label, weekStart, athleteName, sessions, dropped, assumed };
}

/**
 * Parsa TUTTI i fogli del workbook che contengono almeno una sessione.
 * Ogni foglio = una settimana. I fogli vuoti (template, note) vengono scartati.
 * Non solleva eccezioni se un foglio è illeggibile: lo salta e basta.
 */
export function parseAllWeeks(
  buf: ArrayBuffer | Uint8Array | Buffer,
): ParsedWeek[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const out: ParsedWeek[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const week = parseSheetToWeek(ws, name);
    // Anche un foglio da cui non è uscita nessuna sessione va tenuto se aveva
    // righe piene che non abbiamo saputo leggere: è l'unico modo per poterlo
    // dire a chi importa invece di restituire un silenzio.
    if (week.sessions.length > 0 || week.dropped.length > 0) out.push(week);
  }
  return out;
}

/**
 * Parsa un workbook. Se sheetPref è indicato usa quel foglio, altrimenti
 * sceglie automaticamente il foglio con più sessioni (la settimana "vera",
 * scartando template vuoti e fogli-note).
 */
export function parseWorkbook(
  buf: ArrayBuffer | Uint8Array | Buffer,
  sheetPref?: string,
): ParsedWeek {
  const wb = XLSX.read(buf, { type: "buffer" });
  const names = sheetPref && sheetPref.length ? [sheetPref] : wb.SheetNames;

  let best: ParsedWeek | null = null;
  for (const name of names) {
    const ws = wb.Sheets[name];
    if (!ws) {
      if (sheetPref) throw new Error(`Foglio "${sheetPref}" non trovato nel file.`);
      continue;
    }
    const candidate = parseSheetToWeek(ws, name);
    if (!best || candidate.sessions.length > best.sessions.length) best = candidate;
  }

  if (!best) throw new Error("Nessun foglio leggibile nel file.");
  return best;
}
