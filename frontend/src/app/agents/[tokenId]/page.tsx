import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentDetailClient } from "./AgentDetailClient";
import { fetchAgent, isApiErrorStatus } from "../../../lib/api";
import { frontendConfig } from "../../../lib/contracts";

export default async function AgentDetailPage({
  params
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const parsedTokenId = Number(tokenId);
  if (!Number.isInteger(parsedTokenId) || parsedTokenId <= 0) {
    notFound();
  }

  try {
    const agent = await fetchAgent(parsedTokenId);
    return <AgentDetailClient initialAgent={agent} />;
  } catch (error) {
    if (isApiErrorStatus(error, 404)) {
      notFound();
    }

    return (
      <main className="container">
        <div className="row" style={{ marginBottom: 16 }}>
          <Link className="button buttonGhost" href="/">
            Back to Marketplace
          </Link>
        </div>

        <section className="panel stack">
          <p className="eyebrow">Agent Unavailable</p>
          <h1 className="heroTitle" style={{ fontSize: "clamp(2rem, 3.5vw, 3.6rem)", maxWidth: "14ch" }}>
            The detail service did not respond.
          </h1>
          <p className="heroBody">
            The frontend could not load agent #{parsedTokenId} from {frontendConfig.backendUrl}. If the backend was just
            started, wait a moment and refresh.
          </p>
          <p className="small">Expected endpoint: {frontendConfig.backendUrl}/agents/{parsedTokenId}</p>
        </section>
      </main>
    );
  }
}
