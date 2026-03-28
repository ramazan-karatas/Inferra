"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  const injectedConnector = connectors[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (frontendConfig.demoMode) {
    return <button className="button buttonGhost">Preview Mode</button>;
  }

  if (!mounted) {
    return (
      <button className="button" disabled>
        Connect Wallet
      </button>
    );
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
