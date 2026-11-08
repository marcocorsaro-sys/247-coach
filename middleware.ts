import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Separazione dei due prodotti che condividono il codice: le rotte di 24/7 Coach
// (cron AI, bot Telegram, MCP, calendario, area coach /pro, inviti) esistono SOLO
// nell'istanza 24/7 Coach. Nell'istanza di Irene rispondono 404: niente cron
// doppi, niente email agli atleti 247 col mittente di Irene.
const ONLY_247 = /^\/(api\/ai\/(evening|watch|digest|weekly|adaptive|sync|push|perf)(\/|$)|api\/telegram(\/|$)|api\/mcp(\/|$)|api\/cal(\/|$)|pro(\/|$)|invito(\/|$)|diventa-coach(\/|$))/;

function is247(): boolean {
  return process.env.APP_MODE === "ai_coach" || process.env.NEXT_PUBLIC_APP_MODE === "ai_coach";
}

export async function middleware(request: NextRequest) {
  if (!is247() && ONLY_247.test(request.nextUrl.pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tutte le rotte tranne gli asset statici e le immagini.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
