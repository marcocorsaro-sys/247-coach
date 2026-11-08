// Attiva/disattiva lo switch "Entra come atleta" (cookie) e reindirizza.
// Coach → solo i propri atleti. Super admin → qualunque atleta.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VIEW_AS_COOKIE } from "@/lib/server/viewAs";
import { athleteInThisApp } from "@/lib/server/appScope";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const athlete = url.searchParams.get("athlete");
  const clear = url.searchParams.get("clear");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  const { data: profData } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();
  const me = profData as unknown as { role: string; is_admin: boolean | null } | null;
  const isCoach = me?.role === "coach";
  const isAdmin = Boolean(me?.is_admin);

  // Torna al proprio account (coach → area coach; admin-atleta → la sua app).
  if (clear || !athlete) {
    const res = NextResponse.redirect(new URL(isCoach ? "/coach" : "/atleta", url.origin));
    res.cookies.set(VIEW_AS_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  let ok = false;
  if (isCoach) {
    const { data: rel } = await supabase
      .from("coaching_relationships")
      .select("athlete_id")
      .eq("coach_id", user.id)
      .eq("athlete_id", athlete)
      .maybeSingle();
    ok = Boolean(rel);
  } else if (isAdmin) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", athlete)
      .eq("role", "athlete")
      .maybeSingle();
    ok = Boolean(prof);
  }
  // Separazione app: un atleta di Irene non si apre da 24/7 Coach e viceversa.
  if (ok && !(await athleteInThisApp(athlete))) ok = false;
  if (!ok) {
    return NextResponse.redirect(new URL(isCoach ? "/coach" : "/atleta", url.origin));
  }

  const res = NextResponse.redirect(new URL("/atleta", url.origin));
  res.cookies.set(VIEW_AS_COOKIE, athlete, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
