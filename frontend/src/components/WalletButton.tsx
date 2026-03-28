"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { frontendConfig } from "../lib/contracts";

function shortenAddress(address?: string) {
  if (!address) return "Connect Wallet";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const injectedConnector = connectors[0];

  if (frontendConfig.demoMode) {
    return <button className="button buttonGhost">Demo Mode</button>;
  }

  if (isConnected) {
    return (
      <button className="button buttonGhost" onClick={() => disconnect()}>
        {shortenAddress(address)}
      </button>
    );
  }

  return (
    <button
      className="button"
      disabled={!injectedConnector || isPending}
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
