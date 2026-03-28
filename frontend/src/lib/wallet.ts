"use client";

import { QueryClient } from "@tanstack/react-query";
import { createConfig, createStorage, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { frontendConfig } from "./contracts";

export const monadDemoChain = {
  id: frontendConfig.chainId,
  name: "Monad Demo",
  nativeCurrency: { name: "Native", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [frontendConfig.rpcUrl] } }
} as const;

export const wagmiConfig = createConfig({
  chains: [monadDemoChain],
  connectors: [injected({ target: "metaMask" })],
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined
  }),
  transports: { [monadDemoChain.id]: http(frontendConfig.rpcUrl) }
});

export const queryClient = new QueryClient();
