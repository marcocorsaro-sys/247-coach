// Salvataggio della griglia come richiesta normale (non azione del form): il
// client la manda con un tempo massimo e mostra l'errore, invece di restare
// appeso con tutta la navigazione bloccata.
import { NextResponse } from "next/server";
import { runSaveGrid } from "@/lib/server/gridSave";

export const maxDuration = 60;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const r = await runSaveGrid(await req.formData());
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, code: r.code },
        { status: r.code === "auth" ? 401 : 400 },
      );
    }
    return NextResponse.json(r);
  } catch (e) {
    console.error("[griglia] salvataggio", (e as Error).message);
    return NextResponse.json({ ok: false, code: "server" }, { status: 500 });
  }
}
