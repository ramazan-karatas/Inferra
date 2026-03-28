import type { AgentCard } from "../types";

function formatUnitsLike(value: string) {
  const numeric = Number(value) / 1e18;
  if (!Number.isFinite(numeric)) return value;
  return numeric === 0 ? "0" : `${numeric.toFixed(numeric >= 1 ? 2 : 4)} MON`;
}

export function AgentStats({ agent }: { agent: AgentCard }) {
  return (
    <div className="stats">
      <div className="stat">
        <span className="statLabel">Sale Price</span>
        <span className="statValue">{agent.isListed ? formatUnitsLike(agent.salePrice) : "Not listed"}</span>
      </div>
      <div className="stat">
        <span className="statLabel">Usage Price</span>
        <span className="statValue">{agent.usagePrice === "0" ? "Unset" : formatUnitsLike(agent.usagePrice)}</span>
      </div>
      <div className="stat">
        <span className="statLabel">Usage Count</span>
        <span className="statValue">{agent.usageCount}</span>
      </div>
      <div className="stat">
        <span className="statLabel">Success / Failure</span>
        <span className="statValue">{agent.successCount} / {agent.failureCount}</span>
      </div>
    </div>
  );
}
