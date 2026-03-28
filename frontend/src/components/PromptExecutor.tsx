"use client";

import { useEffect, useState } from "react";
import { parseEther, parseEventLogs } from "viem";
import { useAccount, usePublicClient, useSignMessage, useWriteContract } from "wagmi";

import { executeAgent as executeAgentRequest, fetchAgent } from "../lib/api";
import { agentNftAbi, frontendConfig, marketplaceAbi } from "../lib/contracts";
import { buildExecutionMessage } from "../lib/message";
import type { AgentCard } from "../types";

function toPriceValue(input: string): bigint {
  if (!input.trim()) return 0n;
  return parseEther(input);
}

export function PromptExecutor({
  initialAgent,
  onAgentUpdate
}: {
  initialAgent: AgentCard;
  onAgentUpdate?: (agent: AgentCard) => void;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const [agent, setAgent] = useState(initialAgent);
  const [salePrice, setSalePrice] = useState("");
  const [usagePrice, setUsagePrice] = useState("");
  const [prompt, setPrompt] = useState(initialAgent.promptHint);
  const [entitlementId, setEntitlementId] = useState<number | null>(null);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setAgent(initialAgent);
    setPrompt(initialAgent.promptHint);
  }, [initialAgent]);

  const isOwner = address?.toLowerCase() === agent.owner.toLowerCase();

  async function refreshAgent() {
    const nextAgent = await fetchAgent(agent.tokenId);
    setAgent(nextAgent);
    onAgentUpdate?.(nextAgent);
  }

  async function runWrite(action: () => Promise<`0x${string}`>, successMessage: string) {
    try {
      setPending(true);
      setStatus("Waiting for wallet confirmation...");
      const hash = await action();
      setStatus("Waiting for transaction confirmation...");
      if (!publicClient) throw new Error("Public client unavailable.");
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshAgent();
      setStatus(successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Transaction failed.");
    } finally {
      setPending(false);
    }
  }

  async function handlePayForUsage() {
    if (!publicClient) {
      setStatus("Public client unavailable.");
      return;
    }

    try {
      setPending(true);
      setStatus("Waiting for wallet confirmation...");
      const hash = await writeContractAsync({
        address: frontendConfig.agentMarketplaceAddress,
        abi: marketplaceAbi,
        functionName: "payForUsage",
        args: [BigInt(agent.tokenId)],
        value: BigInt(agent.usagePrice)
      });

      setStatus("Waiting for transaction confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: marketplaceAbi,
        logs: receipt.logs,
        eventName: "UsageEntitlementPurchased"
      });
      const event = logs.find((entry) => Number(entry.args.tokenId) === agent.tokenId);
      const nextEntitlementId = event ? Number(event.args.entitlementId) : null;
      setEntitlementId(nextEntitlementId);
      await refreshAgent();
      setStatus(nextEntitlementId ? `Entitlement #${nextEntitlementId} purchased.` : "Usage entitlement purchased.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Usage payment failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleExecute() {
    if (!address) {
      setStatus("Connect a wallet before executing.");
      return;
    }
    if (!entitlementId) {
      setStatus("Pay for usage first so the frontend can track the entitlement.");
      return;
    }

    try {
      setPending(true);
      setStatus("Signing execution request...");
      const timestamp = Math.floor(Date.now() / 1000);
      const message = buildExecutionMessage({
        buyerAddress: address,
        tokenId: BigInt(agent.tokenId),
        entitlementId: BigInt(entitlementId),
        prompt,
        timestamp,
        chainId: frontendConfig.chainId
      });
      const signature = await signMessageAsync({ message });
      setStatus("Calling backend executor...");
      const result = await executeAgentRequest({
        tokenId: agent.tokenId,
        entitlementId,
        buyerAddress: address,
        prompt,
        signature,
        timestamp
      });
      setOutput(result.output ?? result.error ?? "");
      await refreshAgent();
      setStatus(result.ok ? "Execution completed." : "Execution finalized with an agent-side failure.");
      setEntitlementId(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Execution failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2 className="panelTitle">Usage Flow</h2>
        <div className="field">
          <label htmlFor="prompt">Prompt</label>
          <textarea id="prompt" className="textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="button buttonAccent" disabled={pending || agent.usagePrice === "0"} onClick={handlePayForUsage}>
            {pending ? "Working..." : "Pay For Usage"}
          </button>
          <button className="button" disabled={pending || !prompt.trim()} onClick={handleExecute}>
            {pending ? "Working..." : "Execute Agent"}
          </button>
        </div>
        <p className="small">Current tracked entitlement: {entitlementId ?? "none"}</p>
        <p className={`statusText ${/fail|error/i.test(status) ? "errorText" : ""}`}>{status}</p>
      </section>

      {isOwner ? (
        <section className="panel">
          <h2 className="panelTitle">Owner Controls</h2>
          <div className="field">
            <label htmlFor="salePrice">List price in native token</label>
            <input id="salePrice" className="input" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} placeholder="1.0" />
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="button buttonGhost"
              disabled={pending || !salePrice.trim()}
              onClick={() =>
                runWrite(
                  () =>
                    writeContractAsync({
                      address: frontendConfig.agentMarketplaceAddress,
                      abi: marketplaceAbi,
                      functionName: "listAgent",
                      args: [BigInt(agent.tokenId), toPriceValue(salePrice)]
                    }),
                  "Listing updated."
                )
              }
            >
              List Agent
            </button>
            <button
              className="button buttonGhost"
              disabled={pending || !agent.isListed}
              onClick={() =>
                runWrite(
                  () =>
                    writeContractAsync({
                      address: frontendConfig.agentMarketplaceAddress,
                      abi: marketplaceAbi,
                      functionName: "cancelListing",
                      args: [BigInt(agent.tokenId)]
                    }),
                  "Listing canceled."
                )
              }
            >
              Cancel Listing
            </button>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="usagePrice">Usage price in native token</label>
            <input id="usagePrice" className="input" value={usagePrice} onChange={(event) => setUsagePrice(event.target.value)} placeholder="0.1" />
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="button buttonGhost"
              disabled={pending || !usagePrice.trim()}
              onClick={() =>
                runWrite(
                  () =>
                    writeContractAsync({
                      address: frontendConfig.agentMarketplaceAddress,
                      abi: marketplaceAbi,
                      functionName: "setUsagePrice",
                      args: [BigInt(agent.tokenId), toPriceValue(usagePrice)]
                    }),
                  "Usage price updated."
                )
              }
            >
              Set Usage Price
            </button>
            <button
              className="button buttonGhost"
              disabled={pending}
              onClick={() =>
                runWrite(
                  () =>
                    writeContractAsync({
                      address: frontendConfig.agentNftAddress,
                      abi: agentNftAbi,
                      functionName: "setAgentActiveStatus",
                      args: [BigInt(agent.tokenId), !agent.isActive]
                    }),
                  agent.isActive ? "Agent deactivated." : "Agent activated."
                )
              }
            >
              {agent.isActive ? "Deactivate Agent" : "Activate Agent"}
            </button>
          </div>
        </section>
      ) : null}

      {agent.isListed ? (
        <section className="panel">
          <h2 className="panelTitle">Purchase Agent</h2>
          <p className="small">Buying transfers ownership immediately and invalidates the listing once the transaction settles.</p>
          <div className="row">
            <button
              className="button"
              disabled={pending}
              onClick={() =>
                runWrite(
                  () =>
                    writeContractAsync({
                      address: frontendConfig.agentMarketplaceAddress,
                      abi: marketplaceAbi,
                      functionName: "buyAgent",
                      args: [BigInt(agent.tokenId)],
                      value: BigInt(agent.salePrice)
                    }),
                  "Agent purchased."
                )
              }
            >
              Buy Agent
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <h2 className="panelTitle">Latest Output</h2>
        <div className="output">{output || "Run the pay-and-execute flow to see output here."}</div>
      </section>
    </div>
  );
}
