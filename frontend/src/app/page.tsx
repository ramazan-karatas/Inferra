import { AgentCard } from "../components/AgentCard";
import { fetchAgents } from "../lib/api";
import { frontendConfig } from "../lib/contracts";

export default async function HomePage() {
  const agents = await fetchAgents();
  const listedAgents = agents.filter((agent) => agent.isListed);
  const unlistedAgents = agents.filter((agent) => !agent.isListed);

  return (
    <main className="container">
      <section className="heroCard">
        <div className="heroGrid">
          <div className="heroCopy">
            <span className="eyebrow">Agent Commerce</span>
            <h1 className="heroTitle">Agents for sale, ready at first glance.</h1>
            <div className="heroActions">
              <a className="button buttonAccent buttonWide" href="#marketplace">
                View Listings
              </a>
              <span className="button buttonGhost buttonWide">{frontendConfig.appName}</span>
            </div>
            {frontendConfig.demoMode ? (
              <p className="small">Preview mode is active. The interface is running without deployed contracts or a model key.</p>
            ) : null}
            <div className="heroMetrics">
              <div className="metric">
                <span className="metricValue">{listedAgents.length}</span>
                <span className="metricLabel">Live listings</span>
              </div>
              <div className="metric">
                <span className="metricValue">{agents.length}</span>
                <span className="metricLabel">Total agents</span>
              </div>
              <div className="metric">
                <span className="metricValue">{agents.filter((agent) => agent.isActive).length}</span>
                <span className="metricLabel">Active now</span>
              </div>
            </div>
          </div>

          <div className="heroAside">
            <div className="signalCard">
              <span className="signalLabel">For Sale</span>
              <span className="signalValue">{listedAgents.length === 0 ? "No active listings" : `${listedAgents.length} available`}</span>
            </div>
            <div className="signalCard">
              <span className="signalLabel">Usage</span>
              <span className="signalValue">Buy or execute</span>
            </div>
          </div>
        </div>
      </section>

      <section id="marketplace">
        <div className="sectionHeader">
          <div>
            <h2 className="sectionTitle">For Sale Now</h2>
          </div>
        </div>
        <div className="grid">
          {listedAgents.map((agent) => (
            <AgentCard key={agent.tokenId} agent={agent} />
          ))}
        </div>
        {listedAgents.length === 0 ? <p className="small">No agents are currently listed for sale.</p> : null}
      </section>

      <section>
        <div className="sectionHeader sectionHeaderCompact">
          <div>
            <h2 className="sectionTitle">All Agents</h2>
          </div>
        </div>
        <div className="grid">
          {[...listedAgents, ...unlistedAgents].map((agent) => (
            <AgentCard key={`all-${agent.tokenId}`} agent={agent} />
          ))}
        </div>
      </section>
    </main>
  );
}
