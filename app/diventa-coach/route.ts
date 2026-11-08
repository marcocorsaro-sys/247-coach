import { NextResponse } from "next/server";

/** Link per gli allenatori: ricorda che vogliono l'area coach e li manda a registrarsi (o a /pro se già dentro). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") === "login" ? "/login" : "/registrati";
  const res = NextResponse.redirect(new URL(to, url.origin));
  res.cookies.set("pro_signup", "1", { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
  return res;
}
