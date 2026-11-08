import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCoachAccess } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import NewAthleteForm from "./NewAthleteForm";
import { updateAthlete, setAthletePassword, deleteAthlete } from "./actions";
import { ATHLETE_CATEGORIES, CATEGORY_LABEL } from "@/lib/training/categories";
import CoachNav from "@/components/CoachNav";
import ConfirmButton from "@/components/ConfirmButton";

const AV = ["av-violet", "av-amber", "av-cyan", "av-orange", "av-rose", "av-lime"];
const LEVELS: [string, string][] = [
  ["", "—"],
  ["neofita", "Neofita"],
  ["intermedio", "Intermedio"],
  ["avanzato", "Avanzato"],
  ["pro", "Pro"],
];

function initials(name: string | null, email: string): string {
  const base = (name || email).trim();
  const parts = base.split(/\s+/);
  const ini = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (ini || base.slice(0, 2)).toUpperCase();
}

export default async function AthletesAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    pwd?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Nome del coach e controllo d'accesso: due letture indipendenti, insieme.
  const [{ data: profileData }, coachAccess] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
    resolveCoachAccess(supabase, user.id),
  ]);
  const profile = profileData as unknown as Pick<Tables<"profiles">, "full_name" | "role"> | null;
  if (!coachAccess.allowed) redirect("/atleta");
  const coachId = coachAccess.coachId!;

  const { data: relData } = await supabase
    .from("coaching_relationships")
    .select("athlete_id")
    .eq("coach_id", coachId)
    .eq("active", true);
  const ids = ((relData ?? []) as unknown as { athlete_id: string }[]).map((r) => r.athlete_id);

  type P = Pick<Tables<"profiles">, "id" | "full_name" | "email" | "level"> & {
    phone: string | null;
  };
  let athletes: P[] = [];
  const catsByAthlete = new Map<string, string[]>();
  if (ids.length > 0) {
    const [aRes, cRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, level, phone")
        .in("id", ids)
        .order("full_name", { ascending: true }),
      supabase.from("athlete_categories").select("athlete_id, category").in("athlete_id", ids),
    ]);
    athletes = (aRes.data ?? []) as unknown as P[];
    const cats = (cRes.data ?? []) as unknown as { athlete_id: string; category: string }[];
    for (const c of cats) {
      const arr = catsByAthlete.get(c.athlete_id) ?? [];
      arr.push(c.category);
      catsByAthlete.set(c.athlete_id, arr);
    }
  }

  return (
    <div className="wrap-tight">
      <CoachNav label="ATLETI" />

      {sp.created ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Atleta creato — accesso: {sp.created} (annota la password che hai impostato)
        </div>
      ) : null}
      {sp.updated ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Atleta aggiornato
        </div>
      ) : null}
      {sp.pwd ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Password aggiornata
        </div>
      ) : null}
      {sp.deleted ? (
        <div className="pill ok" style={{ marginBottom: 16 }}>
          ✓ Atleta eliminato
        </div>
      ) : null}
      {sp.error ? (
        <div className="pill warn" style={{ marginBottom: 16 }}>
          ⚠ {sp.error}
        </div>
      ) : null}

      <div className="hero">
        <div>
          <span className="mono">// GESTIONE ATLETI</span>
          <h1>
            I tuoi <em>atleti</em>.
          </h1>
          <p>
            Crea gli account dei tuoi atleti, genera email e password, modifica i dati o rimuovili.
          </p>
        </div>
      </div>

      <h2 className="sec">
        <span className="l">Nuovo atleta</span>
      </h2>
      <NewAthleteForm />

      <h2 className="sec">
        <span className="l">Atleti collegati ({athletes.length})</span>
      </h2>
      {athletes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessun atleta ancora. Creane uno qui sopra.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {athletes.map((a, i) => {
            const cats = catsByAthlete.get(a.id) ?? [];
            return (
            <div className="card" key={a.id}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div className={`avatar ${AV[i % AV.length]}`}>
                  {initials(a.full_name, a.email)}
                </div>
                <div style={{ flex: 1 }}>
                  <strong>{a.full_name ?? a.email}</strong>
                  <div className="mono" style={{ color: "var(--text-2)", fontSize: ".8rem" }}>
                    {a.email}
                  </div>
                  {cats.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {cats.map((c) => (
                        <span key={c} className="pill violet pill-plain">
                          {CATEGORY_LABEL[c] ?? c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Link className="btn btn-subtle btn-sm" href={`/coach/atleta/${a.id}`}>
                  Scheda →
                </Link>
              </div>

              {/* modifica dati */}
              <form action={updateAthlete}>
                <input type="hidden" name="athlete_id" value={a.id} />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div className="field" style={{ flex: 1, minWidth: 160 }}>
                    <label className="label">Nome</label>
                    <input className="input" name="full_name" defaultValue={a.full_name ?? ""} />
                  </div>
                  <div className="field" style={{ flex: 1, minWidth: 180 }}>
                    <label className="label">Email</label>
                    <input className="input" name="email" type="email" autoComplete="email" defaultValue={a.email} />
                  </div>
                  <div className="field" style={{ flex: 1, minWidth: 150 }}>
                    <label className="label">Telefono (SMS)</label>
                    <input
                      className="input"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+39333..."
                      defaultValue={a.phone ?? ""}
                    />
                  </div>
                  <div className="field" style={{ width: 140 }}>
                    <label className="label">Livello</label>
                    <select className="input" name="level" defaultValue={a.level ?? ""}>
                      {LEVELS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-subtle btn-sm" type="submit" style={{ marginBottom: 2 }}>
                    Salva
                  </button>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label className="label">Tipo di atleta</label>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                    {ATHLETE_CATEGORIES.map(([value, label]) => (
                      <label
                        key={value}
                        className="mono"
                        style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          name="categories"
                          value={value}
                          defaultChecked={cats.includes(value)}
                        />{" "}
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </form>

              {/* password + elimina */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  marginTop: 10,
                  borderTop: "1px solid var(--line)",
                  paddingTop: 12,
                }}
              >
                <form action={setAthletePassword} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <input type="hidden" name="athlete_id" value={a.id} />
                  <div className="field" style={{ width: 200 }}>
                    <label className="label">Nuova password</label>
                    <input className="input" name="password" type="text" placeholder="min 6 caratteri" />
                  </div>
                  <button className="btn btn-ghost btn-sm" type="submit" style={{ marginBottom: 2 }}>
                    Imposta password
                  </button>
                </form>
                <form action={deleteAthlete} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="athlete_id" value={a.id} />
                  <ConfirmButton
                    message={`Eliminare definitivamente ${a.full_name ?? a.email}? Verranno cancellati account, tabelle, allenamenti e dati. L'operazione non è reversibile.`}
                    className="btn btn-subtle btn-sm"
                    style={{ color: "var(--rose)", marginBottom: 2 }}
                  >
                    Elimina atleta
                  </ConfirmButton>
                </form>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
