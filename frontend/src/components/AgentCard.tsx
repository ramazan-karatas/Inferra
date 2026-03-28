import Link from "next/link";
import type { CSSProperties } from "react";

import type { AgentCard as AgentCardType } from "../types";
import { AgentStats } from "./AgentStats";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AgentCard({ agent }: { agent: AgentCardType }) {
  const tones = [
    "rgba(98, 228, 255, 0.48)",
    "rgba(255, 155, 106, 0.42)",
    "rgba(121, 240, 176, 0.4)",
    "rgba(157, 140, 255, 0.38)"
  ];
  const artStyle = {
    ["--card-tone" as string]: tones[agent.tokenId % tones.length]
  } as CSSProperties;

  return (
    <article className="card">
      <div className="cardImage" style={artStyle}>
        <span className="cardImageBadge">Agent #{agent.tokenId}</span>
      </div>
      <div className="cardHeader">
        <div>
          <p className="eyebrow">{agent.category}</p>
          <h2 className="cardTitle">{agent.name}</h2>
        </div>
        <div className={`pill ${agent.isActive ? "pillOk" : "pillWarn"}`}>{agent.isActive ? "Active" : "Inactive"}</div>
      </div>
      <div className="pillRow">
        <span className="pill">Owner {shortenAddress(agent.owner)}</span>
        <span className="pill">v{agent.version}</span>
        {agent.isListed ? <span className="pill pillOk">For Sale</span> : <span className="pill">Unlisted</span>}
      </div>
      <AgentStats agent={agent} />
      <div className="row">
        <Link className="button buttonAccent" href={`/agents/${agent.tokenId}`}>
          Open Agent
        </Link>
      </div>
    </article>
  );
}
