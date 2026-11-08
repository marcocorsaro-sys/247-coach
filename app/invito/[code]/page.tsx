import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { coachByInvite } from "@/lib/server/humanCoach";
import { acceptInvite } from "@/app/pro/actions";

export const dynamic = "force-dynamic";

/** Invito di un allenatore: l'atleta (nuovo o già iscritto) accetta di farsi seguire. */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  if (!isAiCoachMode()) redirect("/");
  const { code } = await params;
  const coach = await coachByInvite(code);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const box = { maxWidth: 520, margin: "60px auto", padding: "0 16px" } as const;
  if (!coach) {
    return <div style={box}><h1>Invito non valido</h1><p>Chiedi al tuo allenatore un nuovo link.</p><Link href="/">247coachai.com</Link></div>;
  }
  return (
    <div style={box}>
      <span className="mono" style={{ color: "var(--lime, #c6f432)" }}>// 24/7 COACH</span>
      <h1 style={{ margin: "8px 0" }}>{coach.display_name} ti invita a farti seguire</h1>
      <p style={{ color: "var(--text-2)", lineHeight: 1.6 }}>
        {coach.club ? `${coach.club} · ` : ""}Con 24/7 Coach il coach AI costruisce e adatta la tua tabella ogni giorno sui tuoi allenamenti reali. {coach.display_name} vedrà la tua forma, gli allenamenti svolti e la tabella, e potrà dare indicazioni al coach AI. Puoi togliere l'accesso quando vuoi.
      </p>
      {user ? (
        <form action={acceptInvite} style={{ marginTop: 16 }}>
          <input type="hidden" name="code" value={code} />
          <button className="btn btn-primary" type="submit">Accetta e fatti seguire da {coach.display_name}</button>
        </form>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="btn btn-primary" href={`/invito/${code}/go?to=registrati`}>Registrati gratis</Link>
          <Link className="btn" href={`/invito/${code}/go?to=login`}>Ho già un account</Link>
        </div>
      )}
    </div>
  );
}

