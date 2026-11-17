import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { trackAICrawlerRequest } from "@datafast/ai-crawl";
import { updateSession } from "@/lib/supabase/middleware";
import { countryLang } from "@/lib/i18n/config";

// Separazione dei due prodotti che condividono il codice: le rotte di 24/7 Coach
// (cron AI, bot Telegram, MCP, calendario, area coach /pro, inviti) esistono SOLO
// nell'istanza 24/7 Coach. Nell'istanza di Irene rispondono 404: niente cron
// doppi, niente email agli atleti 247 col mittente di Irene.
const ONLY_247 = /^\/(api\/ai\/(evening|watch|digest|weekly|adaptive|sync|push|perf)(\/|$)|api\/telegram(\/|$)|api\/mcp(\/|$)|api\/cal(\/|$)|pro(\/|$)|invito(\/|$)|diventa-coach(\/|$))/;

function is247(): boolean {
  return process.env.APP_MODE === "ai_coach" || process.env.NEXT_PUBLIC_APP_MODE === "ai_coach";
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!is247() && ONLY_247.test(request.nextUrl.pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }
  // DataFast: traccia lato server le visite dei crawler AI (ChatGPT, Claude, Perplexity…)
  // su 247coachai.com. Non traccia le persone né rallenta la risposta (waitUntil); un
  // errore del tracciamento non deve mai fermare una pagina.
  try {
    trackAICrawlerRequest(request, event, { websiteId: "dfid_Eu8S4LdzoHuFWuGIwxsru" });
  } catch {
    /* il tracciamento è accessorio */
  }
  const res = await updateSession(request);
  // Lingua del paese del visitatore (dall'IP), per il suggerimento "questa pagina
  // esiste nella tua lingua" sulle pagine del sito: le pagine restano statiche e
  // indicizzabili, nessun redirect sulle URL con lingua.
  if (is247() && !request.cookies.get("geo_lang")) {
    const gl = countryLang(request.headers.get("x-vercel-ip-country"), request.headers.get("accept-language"));
    if (gl) res.cookies.set("geo_lang", gl, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  }
  return res;
}

export const config = {
  matcher: [
    /*
     * Tutte le rotte tranne gli asset statici e le immagini.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
