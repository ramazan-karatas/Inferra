import type { Metadata } from "next";
import Link from "next/link";

import { Providers } from "../components/Providers";
import { WalletButton } from "../components/WalletButton";
import { frontendConfig } from "../lib/contracts";
import "./globals.css";

export const metadata: Metadata = {
  title: frontendConfig.appName,
  description: "Own, trade, and monetize AI agents with on-chain rights and off-chain execution."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="shell">
            <div className="container hero">
              <div className="topbar">
                <Link className="logo" href="/">
                  {frontendConfig.appName}
                </Link>
                <WalletButton />
              </div>
            </div>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
