"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AgentStats } from "../../../components/AgentStats";
import { PromptExecutor } from "../../../components/PromptExecutor";
import type { AgentCard } from "../../../types";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AgentDetailClient({ initialAgent }: { initialAgent: AgentCard }) {
  const [agent, setAgent] = useState(initialAgent);

  useEffect(() => {
    setAgent(initialAgent);
  }, [initialAgent]);

  return (
    <main className="container">
      <div className="row backRow">
        <Link className="button buttonGhost" href="/">
          Back to Marketplace
        </Link>
      </div>

      <div className="detailLayout">
        <section className="stack">
          <div className="panel detailHero">
            <p className="eyebrow">{agent.category}</p>
            <h1 className="heroTitle detailTitle">{agent.name}</h1>
            <p className="heroBody">{agent.description}</p>
            <div className="pillRow" style={{ marginTop: 14 }}>
              <span className="pill">Agent Key {agent.agentKey}</span>
              <span className="pill">Version {agent.version}</span>
              <span className={`pill ${agent.isActive ? "pillOk" : "pillWarn"}`}>{agent.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="detailSummary">
              <div className="summaryBlock">
                <span className="summaryLabel">Sale Status</span>
                <span className="summaryValue">{agent.isListed ? "Listed for purchase" : "Not currently listed"}</span>
              </div>
              <div className="summaryBlock">
                <span className="summaryLabel">Usage Price</span>
                <span className="summaryValue">{agent.usagePrice === "0" ? "Unset" : `${(Number(agent.usagePrice) / 1e18).toFixed(4)} MON`}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2 className="panelTitle">Performance Snapshot</h2>
            <AgentStats agent={agent} />
          </div>

          <div className="panel">
            <h2 className="panelTitle">Agent Details</h2>
            <div className="metaList">
              <div className="metaItem">
                <span className="metaLabel">Owner</span>
                <span>{shortenAddress(agent.owner)}</span>
              </div>
              <div className="metaItem">
                <span className="metaLabel">Creator</span>
                <span>{shortenAddress(agent.creator)}</span>
              </div>
              <div className="metaItem">
                <span className="metaLabel">Maintainer</span>
                <span>{shortenAddress(agent.maintainer)}</span>
              </div>
              <div className="metaItem">
                <span className="metaLabel">Prompt Hint</span>
                <span>{agent.promptHint}</span>
              </div>
            </div>
          </div>
        </section>

        <PromptExecutor initialAgent={agent} onAgentUpdate={setAgent} />
      </div>
    </main>
  );
}
