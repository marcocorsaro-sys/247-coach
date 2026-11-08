// ============================================================================
// Range di zona personalizzati (inseriti a mano dal coach, tipicamente incollati
// da Word). Il testo del range è conservato e mostrato VERBATIM: nessun
// ricalcolo o arrotondamento, così l'atleta vede esattamente i numeri della
// coach. Quando per una disciplina esistono zone personalizzate, hanno la
// precedenza sulle zone calcolate dal modello.
// ============================================================================

import {
  type Fitness,
  type Zone,
  fmtPace,
  hrZones,
  runPaceZones,
  powerZones,
  swimPaceZones,
} from "./zones";

export interface CustomZone {
  name: string;
  range: string;
}

/** Zone personalizzate per disciplina (chiave = 'run' | 'bike' | 'swim' | ...). */
export type CustomZones = Record<string, CustomZone[]>;

/**
 * Interpreta un blocco di testo incollato in un elenco di zone (nome + range).
 * Una zona per riga. Tollerante ai formati tipici del copia-incolla:
 *   "FR: < 5:30/km"        → FR · "< 5:30/km"
 *   "FL   5:04-4:45"       → FL · "5:04-4:45"
 *   "SA\t150-162 bpm"      → SA · "150-162 bpm"   (tab, es. da tabella Word)
 *   "VO2Max > 4:00"        → VO2Max · "> 4:00"
 * Il testo del range viene preservato così com'è (con eventuali ":" dei passi).
 */
export function parseZonePaste(text: string): CustomZone[] {
  const out: CustomZone[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1) Separatore forte esplicito: tab oppure "=" (non compaiono nei passi).
    const hard = line.search(/[\t=]/);
    if (hard >= 0) {
      const name = line.slice(0, hard).trim();
      const range = line.slice(hard + 1).trim();
      if (name || range) out.push({ name: name || "—", range });
      continue;
    }

    // 2) Codice zona iniziale (FR, FL, FM, SA, VO2Max, Z1…) seguito dal range.
    //    ":" opzionale subito dopo il nome; il resto è il range (può contenere ":").
    const code = line.match(/^([A-Za-z][A-Za-z0-9]{0,7})\s*:?\s+(.+)$/);
    if (code) {
      out.push({ name: code[1].trim(), range: code[2].trim() });
      continue;
    }

    // 3) "Nome: range" generico, purché il ":" non sia quello di un passo (5:04).
    const colon = line.match(/^([^:]+):\s*(.+)$/);
    if (colon && !/\d\s*$/.test(colon[1])) {
      out.push({ name: colon[1].trim(), range: colon[2].trim() });
      continue;
    }

    // 4) Nessun separatore riconosciuto: tengo l'intera riga come range.
    out.push({ name: "—", range: line });
  }
  return out;
}

/** Ricostruisce il testo editabile (una riga per zona) dalle zone salvate. */
export function zonesToText(list: CustomZone[]): string {
  return list.map((z) => `${z.name}\t${z.range}`).join("\n");
}

// --- resa leggibile dei range incollati (SOLO visualizzazione) --------------
// Il testo salvato resta verbatim (editor della coach e push hanno la loro
// gestione): qui si separa la descrizione dai numeri per mostrare le zone
// personalizzate con lo stesso layout di quelle calcolate — etichetta a
// sinistra, intervallo pulito a destra.

// Il segno dei secondi arriva da Word come ’’ (due apostrofi tipografici),
// ″ o ": prima mancava ’ nella classe e i segni restavano appesi all'etichetta
// ("Z1 ’’"), che sul telefono andava a capo in modo storto.
const PACE_RE = /(\d{1,2})\s*[:'’′]\s*(\d{2})(?:\s*['’′"“”″]{1,2})?/g;

function pacesOf(text: string): number[] {
  const out: number[] = [];
  let m: RegExpExecArray | null;
  PACE_RE.lastIndex = 0;
  while ((m = PACE_RE.exec(text))) out.push(Number(m[1]) * 60 + Number(m[2]));
  return out;
}

/** Range numerico pulito ("6:07–5:40 /km", "165–224 W", "< 164 W") o null. */
function prettyRange(text: string, disc: string): string | null {
  const cmp = /</.test(text) ? "< " : />/.test(text) ? "> " : "";
  if (disc === "run" || disc === "swim") {
    const unit = disc === "run" ? "/km" : "/100m";
    const paces = pacesOf(text);
    if (!paces.length) return null;
    if (paces.length === 1) return `${cmp}${fmtPace(paces[0])} ${unit}`;
    return `${fmtPace(Math.max(...paces))}–${fmtPace(Math.min(...paces))} ${unit}`;
  }
  const nums = (text.replace(PACE_RE, " ").match(/\d{2,4}/g) ?? [])
    .map(Number)
    .filter((n) => n >= 40 && n <= 2000);
  if (!nums.length) return null;
  const unit = /bpm|\bfc\b|cardio/i.test(text) ? "bpm" : "W";
  if (nums.length === 1) return `${cmp}${nums[0]} ${unit}`;
  return `${Math.min(...nums)}–${Math.max(...nums)} ${unit}`;
}

/** Descrizione senza numeri e senza separatori di copia-incolla. */
function prettyLabel(name: string, text: string): string {
  const desc = text
    .replace(PACE_RE, " ")
    .replace(/[<>]/g, " ")
    .replace(/\d{2,4}/g, " ");
  const tokens = desc
    .split(/[\/\\_·,;|]+|\s-\s|^-\s*|\s-$/)
    .map((t) => t.replace(/^[\s\-–.'’′"“”″]+|[\s\-–.'’′"“”″]+$/g, ""))
    .filter(Boolean);
  if (name && name !== "—" && tokens[0]?.toLowerCase() !== name.toLowerCase()) {
    tokens.unshift(name);
  }
  return tokens.join(" · ") || name || "—";
}

/**
 * Converte le zone personalizzate nel tipo Zone usato dalle viste, ripulendo
 * etichetta e intervallo. Le righe senza numeri (intestazioni tipo
 * "WATT / Pedali") vengono scartate dalla visualizzazione.
 */
export function customToZones(list: CustomZone[], disc = ""): Zone[] {
  return list
    .filter((z) => /\d/.test(z.range))
    .map((z, i) => {
      const clean = prettyRange(z.range, disc);
      return {
        n: i + 1,
        name: clean ? prettyLabel(z.name, z.range) : z.name,
        range: clean ?? z.range,
        lowVal: null,
        highVal: null,
      };
    });
}

export interface ZoneGroup {
  title: string;
  zones: Zone[];
  custom: boolean;
}

/**
 * Gruppi di zone da mostrare, con PRECEDENZA ai range personalizzati:
 * per corsa/bici/nuoto, se esistono zone incollate a mano si usano quelle
 * (marcate come personalizzate), altrimenti quelle calcolate dal modello.
 * La FC resta sempre calcolata (riferimento generico).
 */
export function zoneGroups(f: Fitness, custom: CustomZones): ZoneGroup[] {
  const pick = (disc: string, title: string, computed: Zone[]): ZoneGroup => {
    const c = custom[disc];
    return c && c.length
      ? { title: `${title} · personalizzato`, zones: customToZones(c, disc), custom: true }
      : { title, zones: computed, custom: false };
  };
  return [
    { title: "// ZONE FC", zones: hrZones(f), custom: false },
    pick("run", "// ZONE PASSO CORSA", runPaceZones(f)),
    pick("bike", "// ZONE BICI", powerZones(f)),
    pick("swim", "// ZONE PASSO NUOTO", swimPaceZones(f)),
  ].filter((g) => g.zones.length > 0);
}
