import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: non inserire codice tra createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // /api/ai/* (cron settimanale, strutturatore): niente sessione utente, si
  // proteggono da sole con il CRON_SECRET — il redirect al login le romperebbe.
  const isAi = process.env.APP_MODE === "ai_coach" || process.env.NEXT_PUBLIC_APP_MODE === "ai_coach";
  const isPublic =
    // Sito pubblico 24/7 Coach: home, calendario gare e schede gara.
    (isAi && (path === "/" || path === "/gare" || path.startsWith("/gare/") || /^\/(en|it|de|fr|es|pt|nl|da|sv|no|fi|pl)(\/|$)/.test(path))) ||
    path === "/login" ||
    path === "/sitemap.xml" ||
    path === "/robots.txt" ||
    path === "/registrati" ||
    path === "/privacy" ||
    path === "/terms" ||
    path === "/no-access" ||
    // Invito di un coach 247: la pagina si vede anche da non loggati.
    (isAi && path.startsWith("/invito/")) ||
    (isAi && path === "/diventa-coach") ||
    path.startsWith("/auth") ||
    path.startsWith("/api/ai/") ||
    path.startsWith("/api/site/") ||
    path.startsWith("/api/telegram/") ||
    // Feed iCal privato (protetto dal token nell'URL): i calendari lo scaricano senza cookie.
    path.startsWith("/api/cal/") ||
    // Server MCP personale (Claude/ChatGPT): protetto dal token nell'URL.
    path.startsWith("/api/mcp/") ||
    // Verifica proprietà Google Search Console (file in /public)
    /^\/google[0-9a-f]+\.html$/.test(path) ||
    // Icona e manifest: iOS e i browser li scaricano senza cookie (appena
    // si salva il link, prima del login). Se rimandassero al login, l'icona
    // non comparirebbe mai.
    path === "/icon" ||
    path === "/apple-icon" ||
    path === "/manifest.webmanifest";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 24/7 Coach e Tabella di Irene condividono il database: in 24/7 Coach
  // entrano nell'app SOLO gli atleti del coach AI (e il super admin, che
  // vede solo /admin e gli atleti 24/7 tramite lo switch). L'area coach di
  // Irene non è raggiungibile da qui.
  const isApp = /^\/(atleta|onboarding|benvenuto|coach|workout|admin|pro)(\/|$)/.test(path);
  if (isAi && user && isApp) {
    const deny = (to: string) => { const u = request.nextUrl.clone(); u.pathname = to; u.search = ""; return NextResponse.redirect(u); };
    const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    const isAdmin = Boolean((me as { is_admin?: boolean } | null)?.is_admin);
    if (path.startsWith("/coach") && !path.startsWith("/coach/view-as")) return deny(isAdmin ? "/admin" : "/no-access");
    if (!isAdmin) {
      const { data: rel } = await supabase.from("coaching_relationships").select("id").eq("athlete_id", user.id).eq("coach_id", "77777777-7777-7777-7777-777777777777").maybeSingle();
      if (!rel || path.startsWith("/admin")) return deny("/no-access");
    } else if (!path.startsWith("/admin") && !path.startsWith("/pro") && !path.startsWith("/coach/view-as") && !request.cookies.get("view_as_athlete")?.value) {
      // Il super admin non ha un'app atleta su 24/7: senza switch attivo va al pannello.
      return deny("/admin");
    }
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
