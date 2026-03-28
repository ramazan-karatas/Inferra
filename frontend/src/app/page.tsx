import { AgentCard } from "../components/AgentCard";
import { fetchAgents } from "../lib/api";
import { frontendConfig } from "../lib/contracts";

export default async function HomePage() {
  const agents = await fetchAgents();

  return (
    <main className="container">
      <section className="heroCard">
        <span className="eyebrow">Monad Hackathon MVP</span>
        <h1 className="heroTitle">Own agents. Trade them. Charge for every run.</h1>
        <p className="heroBody">
          {frontendConfig.appName} turns prompt-based AI agents into on-chain assets with visible ownership, sale
          state, pay-per-use pricing, and trust counters. Rights stay on-chain. Execution stays off-chain.
        </p>
        <div className="heroMetrics">
          <div className="metric">
            <span className="metricValue">{agents.length}</span>
            <span className="metricLabel">Seeded agents in marketplace</span>
          </div>
          <div className="metric">
            <span className="metricValue">ERC-721-style</span>
            <span className="metricLabel">Transferable asset ownership</span>
          </div>
          <div className="metric">
            <span className="metricValue">Two-step flow</span>
            <span className="metricLabel">Pay on-chain, execute off-chain</span>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 30 }}>
        <h2 className="sectionTitle">Marketplace</h2>
        <div className="grid">
          {agents.map((agent) => (
            <AgentCard key={agent.tokenId} agent={agent} />
          ))}
        </div>
      </section>
    </main>
  );
}
