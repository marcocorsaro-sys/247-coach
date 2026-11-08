import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCoachAccess } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import { importExcel } from "./actions";
import ExcelField from "./ExcelField";
import CoachNav from "@/components/CoachNav";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    athlete?: string;
    ok?: string;
    created?: string;
    merged?: string;
    added?: string;
    skipped?: string;
    filled?: string;
    nodate?: string;
    dropped?: string;
    assumed?: string;
  }>;
}) {
  const sp = await searchParams;
  const { error, athlete } = sp;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const coachAccess = await resolveCoachAccess(supabase, user.id);
  if (!coachAccess.allowed) redirect("/atleta");
  const coachId = coachAccess.coachId!;

  const { data: relData } = await supabase
    .from("coaching_relationships")
    .select("athlete_id")
    .eq("coach_id", coachId)
    .eq("active", true);
  const ids = ((relData ?? []) as unknown as { athlete_id: string }[]).map(
    (r) => r.athlete_id,
  );

  let athletes: Pick<Tables<"profiles">, "id" | "full_name" | "email">[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    athletes = (data ?? []) as unknown as typeof athletes;
  }

  return (
    <div className="wrap-tight">
      <CoachNav label="IMPORTA" />

      <div className="hero">
        <div>
          <span className="mono">// IMPORTA</span>
          <h1>
            Importa lo <em>storico</em>.
          </h1>
          <p>
            Carica il file Excel di Irene: leggo <strong>tutti i fogli</strong>{" "}
            (ogni foglio = una settimana) e li mappo sulle settimane dell&apos;anno.
            Se una settimana esiste già, unisco le sessioni mancanti senza
            duplicare i giorni.
          </p>
        </div>
      </div>

      {error ? (
        <div className="pill err" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {sp.dropped ? (
        <div
          className="pill warn"
          style={{
            marginBottom: 16,
            display: "block",
            borderRadius: 12,
            padding: "10px 14px",
            lineHeight: 1.5,
          }}
        >
          ⚠ Nel file ci sono righe piene che non ho saputo leggere, quindi non
          sono entrate in app: {sp.dropped}. Succede quando l&apos;etichetta
          nella prima colonna è diversa da quelle che conosco — nuoto, bici,
          corsa, forza, comment. Rinominala nel foglio e reimporta: il resto
          della settimana resta com&apos;è.
        </div>
      ) : null}

      {sp.assumed ? (
        <div
          className="pill warn"
          style={{
            marginBottom: 16,
            display: "block",
            borderRadius: 12,
            padding: "10px 14px",
            lineHeight: 1.5,
          }}
        >
          ⚠ Nel file mancava l&apos;etichetta di un blocco e l&apos;ho letto in
          base alla posizione: {sp.assumed}. È entrato in app, ma nel foglio
          rimetti la parola nella prima colonna (es. «swim» nella cella A3),
          così la prossima volta non c&apos;è da indovinare.
        </div>
      ) : null}

      {sp.ok ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Import completato — {sp.created ?? 0} settimane create,{" "}
          {sp.merged ?? 0} aggiornate, {sp.added ?? 0} sessioni aggiunte
          {Number(sp.filled ?? 0) > 0
            ? `, ${sp.filled} testi mancanti completati`
            : ""}
          {Number(sp.skipped ?? 0) > 0 ? `, ${sp.skipped} doppioni saltati` : ""}.
          {sp.nodate ? ` Fogli saltati (data non rilevata): ${sp.nodate}.` : ""}
          {athlete ? (
            <>
              {" "}
              <Link href={`/coach/atleta/${athlete}`} style={{ textDecoration: "underline" }}>
                Vai all&apos;atleta →
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <form
        action={importExcel}
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 560,
        }}
      >
        <div className="field">
          <label className="label">Atleta</label>
          <select
            className="input"
            name="athlete_id"
            required
            defaultValue={athlete && ids.includes(athlete) ? athlete : ""}
          >
            <option value="" disabled>
              Seleziona un atleta…
            </option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name ?? a.email}
              </option>
            ))}
          </select>
        </div>

        <ExcelField />
      </form>
    </div>
  );
}
