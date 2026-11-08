import { sessionFitResponse } from "@/lib/server/sessionFit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return sessionFitResponse(id);
}
