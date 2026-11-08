"use client";

export interface ViewAsAthlete {
  id: string;
  name: string;
}

/**
 * Menu fisso in alto a destra per coach e super admin: elenca gli atleti (per
 * l'admin: tutti) e le voci per la vista coach e per tornare al proprio
 * account. La scelta passa da /coach/view-as, che imposta il cookie di switch
 * e reindirizza all'app atleta vera.
 */
export default function ViewAsMenu({
  athletes,
  currentId,
  showCoachView = false,
}: {
  athletes: ViewAsAthlete[];
  currentId: string | null;
  /** Voce "Vista coach" (solo super admin). */
  showCoachView?: boolean;
}) {
  const current = athletes.find((a) => a.id === currentId) ?? null;

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        right: 16,
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: current ? "rgba(200,230,74,.14)" : "rgba(15,17,24,.85)",
        backdropFilter: "blur(20px)",
        border: current ? "1px solid rgba(200,230,74,.45)" : "1px solid var(--line-2)",
        borderRadius: 12,
        padding: "6px 10px",
        boxShadow: "0 8px 28px rgba(0,0,0,.35)",
      }}
    >
      <span aria-hidden style={{ fontSize: ".95rem" }}>👁</span>
      <select
        className="input"
        aria-label="Cambia vista"
        value={currentId ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__coach") window.location.href = "/coach/view-as?clear=1";
          else if (v === "__coachview") window.location.href = "/coach";
          else if (v) window.location.href = `/coach/view-as?athlete=${v}`;
        }}
        style={{
          width: 200,
          padding: "7px 10px",
          fontSize: ".82rem",
          fontWeight: 600,
          background: "transparent",
          border: 0,
          cursor: "pointer",
          color: current ? "var(--lime)" : undefined,
        }}
      >
        <option value="" disabled style={{ background: "var(--bg-2)" }}>
          Cambia vista…
        </option>
        {athletes.map((a) => (
          <option key={a.id} value={a.id} style={{ background: "var(--bg-2)" }}>
            {a.id === currentId ? `👁 ${a.name}` : a.name}
          </option>
        ))}
        {showCoachView ? (
          <option value="__coachview" style={{ background: "var(--bg-2)" }}>
            👩‍🏫 Vista coach (Irene)
          </option>
        ) : null}
        <option value="__coach" style={{ background: "var(--bg-2)" }}>
          ← Torna al mio account
        </option>
      </select>
    </div>
  );
}
