import { NextResponse } from "next/server";

/** Ricorda l'invito del coach (cookie 7 giorni) e manda a registrazione o login. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const url = new URL(req.url);
  const to = url.searchParams.get("to") === "login" ? "/login" : "/registrati";
  const res = NextResponse.redirect(new URL(to, url.origin));
  if (/^[0-9a-f]{6,16}$/i.test(code)) res.cookies.set("coach_invite", code.toLowerCase(), { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
  return res;
}
