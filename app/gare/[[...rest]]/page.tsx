import { permanentRedirect } from "next/navigation";
// URL storici /gare/... → /it/gare/...
export default async function LegacyGare({ params }: { params: Promise<{ rest?: string[] }> }) {
  const { rest } = await params;
  permanentRedirect(`/it/gare${rest?.length ? `/${rest.join("/")}` : ""}`);
}
