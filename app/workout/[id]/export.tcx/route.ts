import { sessionTcxResponse } from "@/lib/server/sessionTcx";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return sessionTcxResponse(id);
}
