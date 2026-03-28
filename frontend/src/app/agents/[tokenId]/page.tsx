import { AgentDetailClient } from "./AgentDetailClient";
import { fetchAgent } from "../../../lib/api";

export default async function AgentDetailPage({
  params
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const agent = await fetchAgent(Number(tokenId));
  return <AgentDetailClient initialAgent={agent} />;
}
