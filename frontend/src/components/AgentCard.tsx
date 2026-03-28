import Link from "next/link";

import type { AgentCard as AgentCardType } from "../types";
import { AgentStats } from "./AgentStats";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AgentCard({ agent }: { agent: AgentCardType }) {
  return (
    <article className="card">
      <div className="cardImage" />
      <div className="cardHeader">
        <div>
          <p className="eyebrow">{agent.category}</p>
          <h2 className="cardTitle">{agent.name}</h2>
        </div>
        <div className={`pill ${agent.isActive ? "pillOk" : "pillWarn"}`}>{agent.isActive ? "Active" : "Inactive"}</div>
      </div>
      <p className="cardBody">{agent.description}</p>
      <div className="pillRow">
        <span className="pill">Owner {shortenAddress(agent.owner)}</span>
        <span className="pill">v{agent.version}</span>
        {agent.isListed ? <span className="pill pillOk">For Sale</span> : <span className="pill">Unlisted</span>}
      </div>
      <AgentStats agent={agent} />
      <div className="row">
        <Link className="button buttonAccent" href={`/agents/${agent.tokenId}`}>
          View Details
        </Link>
      </div>
    </article>
  );
}
