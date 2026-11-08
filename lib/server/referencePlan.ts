// ============================================================================
// "Piano di riferimento" caricato dall'atleta (tabelle di un vecchio coach,
// un piano scaricato, appunti): file → testo → sintesi AI compatta che il
// coach usa come ispirazione (fasi, sedute chiave, progressione), ricalcolando
// le intensità dalle soglie vere dell'atleta.
// ============================================================================
import * as XLSX from "xlsx";
import { generateStructured } from "@/lib/ai/claude";

const MAX_RAW = 60_000;

export function fileToText(buf: Buffer, name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (["xlsx", "xlsm", "xls", "ods", "csv"].includes(ext)) {
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const parts: string[] = [];
    for (const sn of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn], { blankrows: false, dateNF: "yyyy-mm-dd" })
        .split("\n")
        .map((l) => l.replace(/,+$/g, "").trim())
        .filter((l) => l.replace(/,/g, "").trim())
        .join("\n");
      if (csv) parts.push(`=== FOGLIO: ${sn} ===\n${csv}`);
    }
    return parts.join("\n\n").slice(0, MAX_RAW);
  }
  if (["txt", "md", "text"].includes(ext)) return buf.toString("utf8").slice(0, MAX_RAW);
  throw new Error("Formato non supportato: carica un Excel (.xlsx/.xls), un .csv o un .txt, oppure incolla il testo.");
}

export async function summarizeReferencePlan(raw: string, opts: { source?: string; lang?: "it" | "en" } = {}): Promise<string> {
  const res = await generateStructured<{ reference: string }>({
    system:
      "Sei un allenatore di endurance esperto. Ricevi un piano di allenamento o delle tabelle fornite dall'atleta (spesso di suoi ex allenatori). Devi trasformarlo in un PIANO DI RIFERIMENTO compatto (max 9.000 caratteri, in italiano) che un altro coach userà come ispirazione. Non inventare nulla che non sia nel file.",
    prompt: `FONTE: ${opts.source ?? "file caricato dall'atleta"}

CONTENUTO DEL FILE:
${raw}

Scrivi il piano di riferimento con queste sezioni, solo se presenti nel file:
1) ORIGINE E FILOSOFIA: chi lo ha scritto, logica (blocchi, cicli carico/scarico, zone usate).
2) STRUTTURA/FASI: settimane o fasi con date, ore o volumi settimanali, obiettivo di ogni fase, gare intermedie e test.
3) MICROCICLO TIPO: la settimana tipo giorno per giorno (riposo compreso).
4) CATALOGO SEDUTE CHIAVE per fase: le sedute più rappresentative con il dettaglio (ripetute, recuperi, durate, zone del file).
5) NOTE, RISCHI E INDICAZIONI: infortuni, alimentazione, caldo, materiali, viaggi, regole su cosa tagliare.
6) SOGLIE DEL FILE: riportale testualmente come "da NON usare per le intensità: il coach ricalcola dalle soglie attuali dell'atleta".`,
    schema: { type: "object", properties: { reference: { type: "string" } }, required: ["reference"] },
    maxTokens: 6000,
    effort: "medium",
  });
  if (!res.ok || !res.data?.reference) throw new Error(res.ok ? "Sintesi vuota" : "Sintesi non riuscita (AI non disponibile)");
  return res.data.reference.slice(0, 12_000);
}
